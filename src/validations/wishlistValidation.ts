/**
 * Wishlist Validation
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { INTEGER_ID_RULE } from '~/utils/zodValidators.js'

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/** Schema toggle wishlist */
const toggleWishlist = async (
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
    ])
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

export const wishlistValidation = {
  toggleWishlist
}
