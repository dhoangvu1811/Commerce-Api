/**
 * Gọi POST /v1/index/reindex trên ecommerce-Embeddings sau khi catalog thay đổi.
 * Debounce giống recommenderIndexService.
 */

import { env } from '~/config/environment.js'

const DEBOUNCE_MS = 90_000
const REINDEX_TIMEOUT_MS = 120_000

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const isEnabled = (): boolean => {
  return String(env.EMBEDDINGS_REINDEX_ENABLED || '').toLowerCase() === 'true'
}

const runReindex = async (productId?: number): Promise<void> => {
  const baseUrl = env.EMBEDDINGS_SERVICE_URL?.trim()
  if (!baseUrl) {
    return
  }

  const url = new URL('/v1/index/reindex', baseUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REINDEX_TIMEOUT_MS)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const secret = env.EMBEDDINGS_REINDEX_SECRET?.trim()
  if (secret) {
    headers['X-Reindex-Key'] = secret
  }

  const hfToken = env.EMBEDDINGS_HF_TOKEN?.trim()
  if (hfToken) {
    headers['Authorization'] = `Bearer ${hfToken}`
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({ product_id: productId || null, full_reset: false })
    })

    if (!response.ok) {
      console.warn(
        `[embeddingIndex] Reindex failed for product ${productId || 'ALL'}: HTTP ${response.status} ${response.statusText}`
      )
    }
  } catch (err) {
    console.warn(`[embeddingIndex] Reindex request failed for product ${productId || 'ALL'}:`, (err as Error).message)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Lên lịch reindex vector (debounce) cho full reindex, hoặc chạy ngay nếu có ID cụ thể.
 * Không throw.
 */
export const requestEmbeddingReindex = (productId?: number): void => {
  if (!isEnabled()) {
    return
  }

  // Nếu truyền ID cụ thể, chạy ngay lập tức để cập nhật nhanh
  // (Server Python đã có hàng đợi xử lý tuần tự nên không sợ quá tải)
  if (productId) {
    void runReindex(productId)
    return
  }

  // Nếu không truyền ID (tức là cần full reindex), vẫn dùng debounce
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runReindex()
  }, DEBOUNCE_MS)
}
