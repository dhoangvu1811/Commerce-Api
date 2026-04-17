/**
 * Validation cho POST /recommendation-events
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map(e => e.message).join(', ')
}

const singleEventSchema = z
  .object({
    type: z.enum(['similar_impression', 'similar_click']),
    sourceProductId: z.number().int().positive(),
    recommendedProductId: z.number().int().positive().optional(),
    position: z.number().int().min(0).max(99).optional(),
    strategy: z.enum(['guest', 'personalized', 'fallback']).optional(),
    similarityScore: z.number().min(0).max(10).optional(),
    occurredAt: z.string().datetime().optional()
  })
  .superRefine((data, ctx) => {
    if (data.type === 'similar_click' && data.recommendedProductId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'similar_click cần recommendedProductId',
        path: ['recommendedProductId']
      })
    }
  })

const bodySchema = z.object({
  events: z.array(singleEventSchema).min(1).max(20)
})

const ingest = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body)

  if (!parsed.success) {
    next(new ApiError(StatusCodes.BAD_REQUEST, formatZodError(parsed.error)))

    return
  }

  req.body = parsed.data
  next()
}

export const recommendationEventValidation = {
  ingest
}
