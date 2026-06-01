import { describe, test, expect, vi, beforeEach } from 'vitest'
import { OutboxStatus } from '@prisma/client'
import { prisma } from '~/config/prisma.js'
import { env } from '~/config/environment.js'

// Mock environment and module logic
vi.mock('~/config/environment.js', () => ({
  env: {
    OUTBOX_PROCESSOR_ENABLED: 'true',
    OUTBOX_BATCH_SIZE: 10,
    OUTBOX_POLL_INTERVAL_MS: 5000,
    OUTBOX_MAX_RETRIES: 5,
    OUTBOX_HTTP_TIMEOUT_MS: 1000,
    N8N_TELEGRAM_WEBHOOK_URL: 'http://test-webhook.local'
  }
}))

import { processBatch, stopOutboxProcessor } from '~/services/outboxProcessor.js'

// Global fetch mock
const fetchMock = vi.fn()
global.fetch = fetchMock

describe('outboxProcessor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    stopOutboxProcessor()
  })

  test('should process PENDING records and mark them SENT when webhook returns HTTP 200', async () => {
    // Arrange
    const dummyRecord = {
      id: 'mock-uuid-1',
      eventType: 'ORDER_CREATED',
      aggregateType: 'ORDER',
      aggregateId: '10',
      payload: { orderId: 10 },
      status: OutboxStatus.PENDING,
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    vi.spyOn(prisma.webhookOutbox, 'findMany').mockResolvedValue([dummyRecord as any])
    vi.spyOn(prisma.webhookOutbox, 'updateMany').mockResolvedValue({ count: 1 })
    
    // Mock update cho SENT
    const updateSpy = vi.spyOn(prisma.webhookOutbox, 'update').mockResolvedValue(dummyRecord as any)
    
    // Mock fetch OK
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'OK'
    })

    // Act
    await processBatch()

    // Assert
    expect(prisma.webhookOutbox.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.webhookOutbox.updateMany).toHaveBeenCalledWith({
      where: { 
        id: { in: ['mock-uuid-1'] },
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED, OutboxStatus.PROCESSING] }
      },
      data: { status: OutboxStatus.PROCESSING }
    })
    
    expect(fetchMock).toHaveBeenCalledWith('http://test-webhook.local', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Idempotency-Key': 'mock-uuid-1'
      })
    }))
    
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'mock-uuid-1' },
      data: expect.objectContaining({ status: OutboxStatus.SENT })
    }))
  })

  test('should increase retryCount and set FAILED with nextRetryAt when webhook fails', async () => {
    // Arrange
    const dummyRecord = {
      id: 'mock-uuid-2',
      eventType: 'ORDER_CREATED',
      aggregateType: 'ORDER',
      aggregateId: '10',
      status: OutboxStatus.PENDING,
      retryCount: 0,
      payload: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    vi.spyOn(prisma.webhookOutbox, 'findMany').mockResolvedValue([dummyRecord as any])
    vi.spyOn(prisma.webhookOutbox, 'updateMany').mockResolvedValue({ count: 1 })
    const updateSpy = vi.spyOn(prisma.webhookOutbox, 'update').mockResolvedValue(dummyRecord as any)
    
    // Mock fetch error 500
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    })

    // Act
    await processBatch()

    // Assert
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'mock-uuid-2' },
      data: expect.objectContaining({ 
        status: OutboxStatus.FAILED,
        retryCount: 1,
        lastError: 'HTTP 500: Internal Server Error'
      })
    }))
    
    // Check if nextRetryAt was set
    const updateCallArg = updateSpy.mock.calls[0][0]
    expect(updateCallArg.data.nextRetryAt).toBeInstanceOf(Date)
  })

  test('should set FAILED permanently when max retries exceeded', async () => {
    // Arrange
    const dummyRecord = {
      id: 'mock-uuid-3',
      eventType: 'ORDER_CREATED',
      aggregateType: 'ORDER',
      aggregateId: '10',
      status: OutboxStatus.FAILED,
      retryCount: 4, // Next retry will be 5, matching env.OUTBOX_MAX_RETRIES (5)
      nextRetryAt: new Date(Date.now() - 1000), // Due for retry
      payload: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    vi.spyOn(prisma.webhookOutbox, 'findMany').mockResolvedValue([dummyRecord as any])
    vi.spyOn(prisma.webhookOutbox, 'updateMany').mockResolvedValue({ count: 1 })
    const updateSpy = vi.spyOn(prisma.webhookOutbox, 'update').mockResolvedValue(dummyRecord as any)
    
    // Mock fetch throwing network error
    fetchMock.mockRejectedValue(new Error('Network disconnected'))

    // Act
    await processBatch()

    // Assert
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'mock-uuid-3' },
      data: expect.objectContaining({ 
        status: OutboxStatus.FAILED,
        retryCount: 5,
        nextRetryAt: null // Permanently failed
      })
    }))
    
    const updateCallArg = updateSpy.mock.calls[0][0]
    expect(updateCallArg.data.lastError).toContain('Max retries exceeded')
  })

  test('should pick up stale PROCESSING records (stuck recovery)', async () => {
    // Arrange
    vi.spyOn(prisma.webhookOutbox, 'findMany').mockResolvedValue([])
    
    // Act
    await processBatch()

    // Assert
    // Check that findMany OR clause contains the stale PROCESSING check
    const findManyCallArg = (prisma.webhookOutbox.findMany as any).mock.calls[0][0]
    const orClause = findManyCallArg.where.OR
    
    const hasStaleCheck = orClause.some((condition: any) => 
      condition.status === OutboxStatus.PROCESSING && condition.updatedAt?.lte
    )
    
    expect(hasStaleCheck).toBe(true)
  })

  test('should not process if webhook URL is not configured', async () => {
    // Override environment for this test only
    vi.mocked(env).N8N_TELEGRAM_WEBHOOK_URL = ''
    
    const findManySpy = vi.spyOn(prisma.webhookOutbox, 'findMany')
    
    // Act
    await processBatch()
    
    // Assert
    expect(findManySpy).not.toHaveBeenCalled()
    
    // Restore for other tests
    vi.mocked(env).N8N_TELEGRAM_WEBHOOK_URL = 'http://test-webhook.local'
  })
})
