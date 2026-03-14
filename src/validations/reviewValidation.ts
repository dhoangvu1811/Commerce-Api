/**
 * Review Validation
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { INTEGER_ID_RULE } from '~/utils/zodValidators.js'

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/** Schema create review */
const createReview = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = z.object({
    productId: z.union([
      z.number().int().positive(),
      z
        .string()
        .regex(INTEGER_ID_RULE)
        .transform((val) => parseInt(val, 10))
    ]),
    rating: z.union([
      z.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao'),
      z
        .string()
        .regex(/^[1-5]$/, 'Đánh giá phải là số nguyên từ 1 đến 5')
        .transform((val) => parseInt(val, 10))
    ]),
    comment: z.string().max(500, 'Bình luận tối đa 500 ký tự').optional()
  })

  try {
    await correctCondition.parseAsync(req.body)
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(
        new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, formatZodError(error))
      )
    } else {
      next(error)
    }
  }
}

export const reviewValidation = {
  createReview
}
