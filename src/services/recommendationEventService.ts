/**
 * Lưu sự kiện telemetry gợi ý sản phẩm (impression / click)
 */

import { Prisma } from '@prisma/client'
import { prisma } from '~/config/prisma.js'

export type RecommendationEventInput = {
  type: 'similar_impression' | 'similar_click'
  sourceProductId: number
  recommendedProductId?: number
  position?: number
  strategy?: 'guest' | 'personalized' | 'fallback'
  similarityScore?: number
  occurredAt?: string
}

const createBatch = async (events: RecommendationEventInput[], userId: number | null): Promise<number> => {
  if (events.length === 0) {
    return 0
  }

  const data = events.map(event => ({
    type: event.type,
    sourceProductId: event.sourceProductId,
    recommendedProductId: event.recommendedProductId ?? null,
    position: event.position ?? null,
    strategy: event.strategy ?? null,
    similarityScore:
      event.similarityScore != null && Number.isFinite(event.similarityScore)
        ? new Prisma.Decimal(Number(event.similarityScore))
        : null,
    userId,
    occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date()
  }))

  const result = await prisma.recommendationEvent.createMany({ data })

  return result.count
}

export const recommendationEventService = {
  createBatch
}
