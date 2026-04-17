/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { env } from '~/config/environment.js'

const originalUrl = env.RECOMMENDER_API_URL
const originalEnabled = env.RECOMMENDER_REINDEX_ENABLED
const originalSecret = env.RECOMMENDER_REINDEX_SECRET

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.resetModules()
  env.RECOMMENDER_API_URL = originalUrl
  env.RECOMMENDER_REINDEX_ENABLED = originalEnabled
  env.RECOMMENDER_REINDEX_SECRET = originalSecret
})

describe('recommenderIndexService.requestReindex', () => {
  test('should POST /recommendations/reindex after debounce when enabled', async () => {
    vi.useFakeTimers()
    env.RECOMMENDER_API_URL = 'http://localhost:8020'
    env.RECOMMENDER_REINDEX_ENABLED = 'true'
    env.RECOMMENDER_REINDEX_SECRET = 'secret-key'

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const { requestReindex } = await import('~/services/recommenderIndexService.js')

    requestReindex()
    expect(fetchMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(90_000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('/recommendations/reindex')
    expect(init.method).toBe('POST')
    expect((init.headers as any)['X-Reindex-Key']).toBe('secret-key')
  })

  test('should not call fetch when reindex disabled', async () => {
    vi.useFakeTimers()
    env.RECOMMENDER_API_URL = 'http://localhost:8020'
    env.RECOMMENDER_REINDEX_ENABLED = 'false'

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { requestReindex } = await import('~/services/recommenderIndexService.js')

    requestReindex()
    await vi.advanceTimersByTimeAsync(90_000)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
