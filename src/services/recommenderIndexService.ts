/**
 * Gọi POST /recommendations/reindex trên Python recommender sau khi catalog thay đổi.
 * Debounce trailing: nhiều thao tác liên tiếp chỉ dẫn tới một lần reindex sau khi yên ~90s.
 * Lưu ý: debounce là in-memory (một process); multi-instance cần cron dự phòng hoặc Redis.
 */

import { env } from '~/config/environment.js'

const DEBOUNCE_MS = 90_000
const REINDEX_TIMEOUT_MS = 15_000

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const isReindexEnabled = (): boolean => {
  return String(env.RECOMMENDER_REINDEX_ENABLED || '').toLowerCase() === 'true'
}

const runReindex = async (): Promise<void> => {
  const baseUrl = env.RECOMMENDER_API_URL?.trim()
  if (!baseUrl) {
    return
  }

  const url = new URL('/recommendations/reindex', baseUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REINDEX_TIMEOUT_MS)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const secret = env.RECOMMENDER_REINDEX_SECRET?.trim()
  if (secret) {
    headers['X-Reindex-Key'] = secret
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      signal: controller.signal,
      headers
    })

    if (!response.ok) {
      console.warn(
        `[recommenderIndex] Reindex failed: HTTP ${response.status} ${response.statusText}`
      )
    }
  } catch (err) {
    console.warn('[recommenderIndex] Reindex request failed:', (err as Error).message)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Lên lịch reindex (debounce). Không throw; lỗi chỉ log warn.
 */
export const requestReindex = (): void => {
  if (!isReindexEnabled()) {
    return
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runReindex()
  }, DEBOUNCE_MS)
}
