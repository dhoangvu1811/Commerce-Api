import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment.js'
import ApiError from '~/utils/ApiError.js'
import type { AiChatPayload, AiChatReply, AiChatSource } from '~/types/aiChat.types.js'

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
 * Proxy chat tới n8n webhook (RAG).
 */
const sendChatMessage = async (payload: AiChatPayload): Promise<AiChatReply> => {
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

  const body = {
    message: payload.message,
    conversationId: payload.conversationId,
    productId: payload.productId,
    locale: payload.locale || 'vi',
    internalKey: env.AI_CHAT_INTERNAL_SECRET || undefined
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
        typeof json === 'object' && json && 'message' in json
          ? String((json as { message?: unknown }).message)
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
