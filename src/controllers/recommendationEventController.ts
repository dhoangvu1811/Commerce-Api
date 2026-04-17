/**
 * Recommendation telemetry — impression / click
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { recommendationEventService } from '~/services/recommendationEventService.js'
import type { RecommendationEventInput } from '~/services/recommendationEventService.js'

const ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsedUserId = req.jwtDecoded?._id ? parseInt(req.jwtDecoded._id, 10) : NaN
    const userId = Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null

    const events = req.body?.events as RecommendationEventInput[]

    const accepted = await recommendationEventService.createBatch(events, userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đã ghi nhận sự kiện gợi ý',
      data: { accepted }
    })
  } catch (error) {
    next(error)
  }
}

export const recommendationEventController = {
  ingest
}
