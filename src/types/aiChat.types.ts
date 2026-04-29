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

export interface ImageSearchHit {
  id: string
  score: number
  payload: {
    product_id: number
    name: string
    slug: string
    category_name: string
    price: number
    image: string
    url: string
  }
}

export interface ImageSearchResult {
  hits: ImageSearchHit[]
}
