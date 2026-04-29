import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment.js'
import ApiError from '~/utils/ApiError.js'
import type { AiChatPayload, AiChatReply, AiChatSource, ImageSearchHit } from '~/types/aiChat.types.js'

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
 * In-memory cache: lưu image search results theo conversationId
 * để các lượt text tiếp theo vẫn có context ảnh.
 * TTL: 10 phút — sau đó tự xóa để tránh memory leak.
 */
const IMAGE_CACHE_TTL_MS = 10 * 60 * 1000
const imageResultsCache = new Map<string, { results: ImageSearchHit[]; ts: number }>()

const getCachedImageResults = (conversationId: string): ImageSearchHit[] => {
  const entry = imageResultsCache.get(conversationId)
  if (!entry) return []
  if (Date.now() - entry.ts > IMAGE_CACHE_TTL_MS) {
    imageResultsCache.delete(conversationId)
    return []
  }
  return entry.results
}

const setCachedImageResults = (conversationId: string, results: ImageSearchHit[]): void => {
  imageResultsCache.set(conversationId, { results, ts: Date.now() })

  // Cleanup: xóa các entry quá hạn (chạy lazy, tối đa 50 entry/lần)
  if (imageResultsCache.size > 100) {
    const now = Date.now()
    let cleaned = 0
    for (const [key, val] of imageResultsCache) {
      if (now - val.ts > IMAGE_CACHE_TTL_MS) {
        imageResultsCache.delete(key)
        if (++cleaned >= 50) break
      }
    }
  }
}

/**
 * Unified chat handler:
 * 1. Nếu có ảnh → gọi image search → cache kết quả
 * 2. Nếu chỉ text → lấy cached image results (nếu có)
 * 3. Gửi tất cả cho n8n
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
  let imageSearchResults: ImageSearchHit[] = []

  if (hasImage) {
    // Lượt có ảnh mới → search + cache
    imageSearchResults = await searchByImage(imageBuffer)
    if (conversationId && imageSearchResults.length > 0) {
      setCachedImageResults(conversationId, imageSearchResults)
    }
  } else if (conversationId) {
    // Lượt text only → lấy cached image results (nếu có)
    imageSearchResults = getCachedImageResults(conversationId)
  }

  // hasImage = true  → n8n skip text search, chỉ dùng imageSearchResults
  // hasImage = false + có cached image → n8n chạy text search + có imageSearchResults context
  const body = {
    message: payload.message || '',
    conversationId,
    productId: payload.productId,
    locale: payload.locale || 'vi',
    internalKey: env.AI_CHAT_INTERNAL_SECRET || undefined,
    imageSearchResults,
    hasImage
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
          ? String((json as any).reply || (json as any).message || '')
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
