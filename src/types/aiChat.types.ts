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

// === SA-1: Image History Cache ===

/** Mỗi lượt ảnh trong conversation (lưu trong imageHistory[]) */
export interface ImageTurn {
  turnIndex: number // Số thứ tự turn khi ảnh được upload (1-based)
  timestamp: number // Unix timestamp (ms)
  productName: string // Tên SP chính từ results[0].payload.name
  results: ImageSearchHit[] // Kết quả search ảnh của lượt này
}

/** State của một conversation, lưu trong in-memory cache */
export interface ConversationState {
  imageHistory: ImageTurn[] // Mảng các lượt ảnh (tối đa 5, FIFO)
  turnCounter: number // Đếm tổng số turn (tăng mỗi lần gọi sendChatMessage)
  lastActivity: number // Timestamp hoạt động cuối (dùng cho TTL check, reset mỗi turn)
}

// === SA-4: Turn metadata ===

/** Loại turn hiện tại */
export type TurnType = 'text' | 'image' | 'hybrid'

/** ImageSearchHit kèm metadata nguồn gốc lượt ảnh (dùng khi flatten imageHistory) */
export interface EnrichedImageSearchHit extends ImageSearchHit {
  _imageTurnIndex: number // Index của lượt ảnh trong imageHistory (0-based)
  _imageTurnTimestamp: number // Timestamp của lượt ảnh gốc
}
