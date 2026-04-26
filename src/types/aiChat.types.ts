export interface AiChatPayload {
  message: string
  conversationId?: string
  productId?: number
  locale?: string
}

export interface AiChatSource {
  productId: number
  title: string
  url: string
  score?: number
}

export interface AiChatReply {
  reply: string
  sources: AiChatSource[]
}
