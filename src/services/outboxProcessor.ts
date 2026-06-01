/* eslint-disable no-console */
/**
 * Transactional Outbox Processor
 * Worker nền quét và gửi các event ra ngoài hệ thống (n8n Webhook)
 */

import { OutboxStatus } from '@prisma/client'
import { prisma } from '~/config/prisma.js'
import { env } from '~/config/environment.js'

let isRunning = false
let intervalId: NodeJS.Timeout | null = null

/**
 * Tính toán thời gian retry backoff
 * lần 1: +30s
 * lần 2: +2m
 * lần 3: +10m
 * lần 4+: +30m
 */
const calculateNextRetryAt = (retryCount: number): Date => {
  const now = new Date()
  let delayMs = 30000 // default 30s

  if (retryCount === 1) {
    delayMs = 30 * 1000 // 30s
  } else if (retryCount === 2) {
    delayMs = 2 * 60 * 1000 // 2m
  } else if (retryCount === 3) {
    delayMs = 10 * 60 * 1000 // 10m
  } else {
    delayMs = 30 * 60 * 1000 // 30m
  }

  return new Date(now.getTime() + delayMs)
}

/**
 * Xử lý một batch outbox records
 */
export const processBatch = async (): Promise<void> => {
  if (isRunning) return
  isRunning = true

  try {
    const batchSize = env.OUTBOX_BATCH_SIZE
    const maxRetries = env.OUTBOX_MAX_RETRIES
    const webhookUrl = env.N8N_TELEGRAM_WEBHOOK_URL

    if (!webhookUrl) {
      console.warn('[OutboxProcessor] N8N_TELEGRAM_WEBHOOK_URL chưa được cấu hình. Bỏ qua batch.')
      isRunning = false

      return
    }

    // 1) Lấy các bản ghi PENDING, FAILED cần retry, hoặc PROCESSING bị stuck
    const now = new Date()
    const staleThreshold = new Date(now.getTime() - 10 * 60 * 1000) // 10 phút trước
    
    const records = await prisma.webhookOutbox.findMany({
      where: {
        OR: [
          { status: OutboxStatus.PENDING },
          {
            status: OutboxStatus.FAILED,
            nextRetryAt: { lte: now }
          },
          {
            status: OutboxStatus.PROCESSING,
            updatedAt: { lte: staleThreshold }
          }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize
    })

    if (records.length === 0) {
      isRunning = false
      
      return
    }

    console.log(`[OutboxProcessor] Tìm thấy ${records.length} outbox events để xử lý.`)

    // 2) Chuyển các bản ghi này sang trạng thái PROCESSING để lock
    // Thêm filter status để tránh race condition khi nhiều instances
    const recordIds = records.map(r => r.id)
    const updateResult = await prisma.webhookOutbox.updateMany({
      where: { 
        id: { in: recordIds },
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED, OutboxStatus.PROCESSING] }
      },
      data: { status: OutboxStatus.PROCESSING }
    })

    // Log nếu có records không được claim (đã bị instance khác xử lý)
    if (updateResult.count < records.length) {
      console.log(`[OutboxProcessor] Chỉ claim được ${updateResult.count}/${records.length} records (các records khác đã bị xử lý bởi instance khác).`)
    }

    // 3) Xử lý từng bản ghi
    for (const record of records) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), env.OUTBOX_HTTP_TIMEOUT_MS)

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': record.id,
            'X-Event-Id': record.id
          },
          body: JSON.stringify({
            eventId: record.id,
            eventType: record.eventType,
            aggregateType: record.aggregateType,
            aggregateId: record.aggregateId,
            payload: record.payload
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          // Success -> Mark as SENT
          await prisma.webhookOutbox.update({
            where: { id: record.id },
            data: {
              status: OutboxStatus.SENT,
              sentAt: new Date(),
              lastError: null
            }
          })
          console.log(`[OutboxProcessor] Gửi event thành công: ${record.eventType} (ID: ${record.id})`)
        } else {
          // HTTP Error status
          const errorText = await response.text().catch(() => 'No response body')
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
      } catch (error: any) {
        // Fail -> Increse retryCount, update status and backoff
        const nextRetryCount = record.retryCount + 1
        const errorMessage = error.message || String(error)
        console.error(`[OutboxProcessor] Lỗi khi gửi event ID ${record.id}:`, errorMessage)

        if (nextRetryCount >= maxRetries) {
          // Vượt ngưỡng max retries -> permanently FAILED
          await prisma.webhookOutbox.update({
            where: { id: record.id },
            data: {
              status: OutboxStatus.FAILED,
              retryCount: nextRetryCount,
              nextRetryAt: null,
              lastError: `Max retries exceeded. Last error: ${errorMessage}`
            }
          })
        } else {
          // Còn lượt retry -> Lên lịch retry tiếp theo
          const nextRetryAt = calculateNextRetryAt(nextRetryCount)
          await prisma.webhookOutbox.update({
            where: { id: record.id },
            data: {
              status: OutboxStatus.FAILED,
              retryCount: nextRetryCount,
              nextRetryAt,
              lastError: errorMessage
            }
          })
        }
      }
    }
  } catch (globalError) {
    console.error('[OutboxProcessor] Global error in background processor:', globalError)
  } finally {
    isRunning = false
  }
}

/**
 * Khởi động Outbox Processor
 */
export const startOutboxProcessor = (): void => {
  if (env.OUTBOX_PROCESSOR_ENABLED === 'false') {
    console.log('🔌 [OutboxProcessor] Outbox processor đã bị vô hiệu hóa bởi cấu hình environment.')

    return
  }

  if (intervalId) {
    console.warn('[OutboxProcessor] Outbox processor đang chạy rồi.')

    return
  }

  console.log(`⚙️ [OutboxProcessor] Khởi động outbox processor (interval: ${env.OUTBOX_POLL_INTERVAL_MS}ms)`)

  // Chạy ngay lập tức lần đầu tiên
  processBatch()

  // Thiết lập interval
  intervalId = setInterval(processBatch, env.OUTBOX_POLL_INTERVAL_MS)
}

/**
 * Tắt Outbox Processor
 */
export const stopOutboxProcessor = (): void => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('🛑 [OutboxProcessor] Đã dừng outbox processor.')
  }
}
