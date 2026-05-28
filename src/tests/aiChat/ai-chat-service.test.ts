import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { aiChatService } from '~/services/aiChatService.js'

import { env } from '~/config/environment.js'

describe('aiChatService.sendChatMessage', () => {
  const originalFetch = global.fetch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: any
  let originalWebhookUrl: string

  beforeEach(() => {
    originalWebhookUrl = env.N8N_AI_CHAT_WEBHOOK_URL
    env.N8N_AI_CHAT_WEBHOOK_URL = 'http://localhost/n8n-webhook'

    fetchMock = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        text: async () => JSON.stringify({ reply: 'AI response', sources: [] })
      } as Response
    })
    global.fetch = fetchMock
  })

  afterEach(() => {
    env.N8N_AI_CHAT_WEBHOOK_URL = originalWebhookUrl
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should_increment_turnIndex_when_called_sequentially_with_same_conversationId', async () => {
    const conversationId = 'test-conversation-id-1'

    // First message (hybrid)
    await aiChatService.sendChatMessage({
      message: 'Hello with image',
      conversationId,
      locale: 'vi'
    }, Buffer.from('fake-image-data')) // hybrid has imageBuffer

    // Second message (text)
    await aiChatService.sendChatMessage({
      message: 'Hello again',
      conversationId,
      locale: 'vi'
    }) // text has no imageBuffer

    expect(fetchMock).toHaveBeenCalledTimes(2)

    // Check first call body (hybrid)
    const firstCallJson = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(firstCallJson.turnIndex).toBe(1)
    expect(firstCallJson.turnType).toBe('hybrid')

    // Check second call body (text)
    const secondCallJson = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(secondCallJson.turnIndex).toBe(2)
    expect(secondCallJson.turnType).toBe('text')
  })

  it('should_keep_turnIndex_as_1_when_conversationId_is_empty_or_undefined', async () => {
    // First message (hybrid) with empty conversationId
    await aiChatService.sendChatMessage({
      message: 'Hello empty id',
      conversationId: '',
      locale: 'vi'
    }, Buffer.from('fake-image-data'))

    // Second message (text) with empty conversationId
    await aiChatService.sendChatMessage({
      message: 'Hello again empty id',
      conversationId: '',
      locale: 'vi'
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)

    // Both should have turnIndex = 1
    const firstCallJson = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(firstCallJson.turnIndex).toBe(1)

    const secondCallJson = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(secondCallJson.turnIndex).toBe(1)
  })
})
