import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment.js'
import ApiError from '~/utils/ApiError.js'
import type {
  AiChatPayload, AiChatReply, AiChatSource, ImageSearchHit,
  ConversationState, ImageTurn, TurnType, EnrichedImageSearchHit
} from '~/types/aiChat.types.js'

const parseWebhookReply = (raw: unknown): { reply: string; sources: AiChatSource[] } => {
  if (!raw || typeof raw !== 'object') {
    return { reply: '', sources: [] }
  }
  const o = raw as Record<string, unknown>
  const reply = typeof o.reply === 'string' ? o.reply : ''
  const sources: AiChatSource[] = []
  if (Array.isArray(o.sources)) {
    for (const s of o.sources) {
      if (!s || typeof s !== 'object') continue
      const x = s as Record<string, unknown>
      const productId = Number(x.productId) || 0
      if (productId <= 0) continue
      const item: AiChatSource = {
        productId,
        title: typeof x.title === 'string' ? x.title : '',
        url: typeof x.url === 'string' ? x.url : ''
      }
      if (typeof x.score === 'number') {
        item.score = x.score
      }
      sources.push(item)
    }
  }

  return { reply, sources }
}

/**
 * Gọi ecommerce-Embeddings search-by-image (nội bộ).
 * Trả về danh sách image hits hoặc mảng rỗng nếu lỗi.
 */
const searchByImage = async (imageBuffer: Buffer, limit = 8): Promise<ImageSearchHit[]> => {
  const url = env.EMBEDDINGS_IMAGE_SEARCH_URL?.trim()
  if (!url) return []

  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(imageBuffer)]), 'search.jpg')
  formData.append('limit', String(limit))
  formData.append('score_threshold', '0.3')

  const headers: Record<string, string> = {}
  const hfToken = env.EMBEDDINGS_HF_TOKEN?.trim()
  if (hfToken) {
    headers['Authorization'] = `Bearer ${hfToken}`
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 60_000)

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
      signal: controller.signal
    })

    const text = await res.text()
    let json: unknown
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      return []
    }

    if (!res.ok) return []

    const data = (json as { data?: { hits?: ImageSearchHit[] } })?.data

    return data?.hits ?? []
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}

/**
 * SA-1: In-memory cache lưu ConversationState (image history + turn counter)
 * theo conversationId. TTL: 10 phút — reset mỗi khi có turn mới.
 * Giữ tối đa 5 lượt ảnh per conversation (FIFO).
 */
const IMAGE_CACHE_TTL_MS = 10 * 60 * 1000
const MAX_IMAGE_TURNS = 5
const conversationCache = new Map<string, ConversationState>()

/** Lấy conversation state, trả null nếu không có hoặc đã hết hạn TTL */
const getConversationState = (conversationId: string): ConversationState | null => {
  const state = conversationCache.get(conversationId)
  if (!state) return null
  // TTL check dựa trên lastActivity (reset mỗi turn mới)
  if (Date.now() - state.lastActivity > IMAGE_CACHE_TTL_MS) {
    conversationCache.delete(conversationId)

    return null
  }

  return state
}

/** Tạo ConversationState mới (empty) */
const createEmptyState = (): ConversationState => ({
  imageHistory: [],
  turnCounter: 0,
  lastActivity: Date.now()
})

/** SA-1: Push lượt ảnh mới vào imageHistory (FIFO, tối đa MAX_IMAGE_TURNS) */
const pushImageTurn = (
  state: ConversationState,
  turnIndex: number,
  results: ImageSearchHit[]
): void => {
  // Tên SP chính = tên sản phẩm đầu tiên trong results
  const productName = results[0]?.payload?.name || '(Không rõ)'

  const newTurn: ImageTurn = {
    turnIndex,
    timestamp: Date.now(),
    productName,
    results
  }

  state.imageHistory.push(newTurn)

  // FIFO: giữ tối đa 5 image turns, loại lượt cũ nhất
  while (state.imageHistory.length > MAX_IMAGE_TURNS) {
    state.imageHistory.shift()
  }

  state.lastActivity = Date.now()
}

/** Lazy cleanup: xóa các conversation quá hạn (tối đa 50/lần) */
const lazyCleanupCache = (): void => {
  if (conversationCache.size > 100) {
    const now = Date.now()
    let cleaned = 0
    for (const [key, val] of conversationCache) {
      if (now - val.lastActivity > IMAGE_CACHE_TTL_MS) {
        conversationCache.delete(key)
        if (++cleaned >= 50) break
      }
    }
  }
}

/**
 * SA-1: Flatten imageHistory thành mảng EnrichedImageSearchHit[].
 * - Thứ tự: lượt ảnh GẦN NHẤT trước, lượt cũ sau (reverse)
 * - Dedup theo product_id (giữ kết quả từ lượt ảnh gần nhất)
 * - Mỗi hit kèm metadata: _imageTurnIndex, _imageTurnTimestamp
 */
const flattenImageHistory = (imageHistory: ImageTurn[]): EnrichedImageSearchHit[] => {
  const seen = new Set<number>()
  const enriched: EnrichedImageSearchHit[] = []

  // Duyệt từ lượt mới nhất → cũ nhất
  for (let i = imageHistory.length - 1; i >= 0; i--) {
    const turn = imageHistory[i]
    if (!turn) continue
    for (const hit of turn.results) {
      const pid = hit.payload?.product_id
      if (!pid || seen.has(pid)) continue
      seen.add(pid)
      enriched.push({
        ...hit,
        _imageTurnIndex: turn.turnIndex,
        _imageTurnTimestamp: turn.timestamp
      })
    }
  }

  return enriched
}

/**
 * Unified chat handler:
 * 1. Lấy/tạo conversation state (SA-1)
 * 2. Tăng turnCounter, xác định turnType (SA-4)
 * 3. Nếu có ảnh → gọi image search → push vào imageHistory (SA-1)
 * 4. Nếu chỉ text → flatten imageHistory làm imageSearchResults (SA-1)
 * 5. Gửi tất cả cho n8n kèm metadata (SA-4)
 */
const sendChatMessage = async (payload: AiChatPayload, imageBuffer?: Buffer): Promise<AiChatReply> => {
  const url = env.N8N_AI_CHAT_WEBHOOK_URL?.trim()
  const timeoutMs =
    Number.isFinite(env.AI_CHAT_WEBHOOK_TIMEOUT_MS) && env.AI_CHAT_WEBHOOK_TIMEOUT_MS > 0
      ? env.AI_CHAT_WEBHOOK_TIMEOUT_MS
      : 120_000

  if (!url) {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      'Chat AI chưa được cấu hình (thiếu N8N_AI_CHAT_WEBHOOK_URL).'
    )
  }

  const conversationId = payload.conversationId || ''
  const hasImage = !!(imageBuffer && imageBuffer.length > 0)
  let imageSearchResults: (ImageSearchHit | EnrichedImageSearchHit)[] = []

  // SA-1: Lấy hoặc tạo conversation state
  let state = conversationId
    ? (getConversationState(conversationId) || createEmptyState())
    : createEmptyState()

  // SA-4: Tăng turn counter
  state.turnCounter += 1
  const turnIndex = state.turnCounter

  // SA-4: Xác định loại turn
  const messageText = (payload.message || '').trim()
  const turnType: TurnType = hasImage
    ? (messageText ? 'hybrid' : 'image')
    : 'text'

  if (hasImage) {
    // Lượt có ảnh mới → search + push vào imageHistory
    const newResults = await searchByImage(imageBuffer)
    if (conversationId && newResults.length > 0) {
      pushImageTurn(state, turnIndex, newResults)
    }
    // imageSearchResults = kết quả ảnh mới (không flatten, vì đây là turn image)
    imageSearchResults = newResults
  } else if (conversationId && state.imageHistory.length > 0) {
    // Lượt text only + có image history → flatten toàn bộ (gần nhất trước, dedup)
    imageSearchResults = flattenImageHistory(state.imageHistory)
  }

  // SA-1: Cập nhật lastActivity và persist state
  state.lastActivity = Date.now()
  if (conversationId) {
    conversationCache.set(conversationId, state)
    lazyCleanupCache()
  }

  // Build payload gửi n8n — backward compatible + fields mới
  const body = {
    message: payload.message || '',
    conversationId,
    productId: payload.productId,
    locale: payload.locale || 'vi',
    internalKey: env.AI_CHAT_INTERNAL_SECRET || undefined,
    // Backward compatible: flatten results để n8n IF node vẫn hoạt động
    imageSearchResults,
    hasImage,
    // SA-1: Full image history array
    imageHistory: state.imageHistory,
    // SA-4: Turn metadata
    turnIndex,
    turnType,
    imageHistoryCount: state.imageHistory.length,
    hasImageHistory: state.imageHistory.length > 0,
    imageTurnIndex: hasImage ? turnIndex : undefined
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const secret = env.AI_CHAT_INTERNAL_SECRET?.trim()
  if (secret) {
    headers['X-Internal-Key'] = secret
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    })

    const text = await res.text()
    let json: unknown
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      throw new ApiError(StatusCodes.BAD_GATEWAY, 'Phản hồi chat AI không hợp lệ (JSON).')
    }

    if (!res.ok) {
      const msg =
        typeof json === 'object' && json
          ? String((json as Record<string, unknown>).reply || (json as Record<string, unknown>).message || '')
          : res.statusText

      throw new ApiError(StatusCodes.BAD_GATEWAY, msg || 'Webhook chat lỗi')
    }

    const parsed = parseWebhookReply(json)

    return {
      reply: parsed.reply,
      sources: parsed.sources
    }
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      `Không kết nối được chat AI: ${(e as Error).message}`
    )
  } finally {
    clearTimeout(t)
  }
}

export const aiChatService = {
  sendChatMessage
}
