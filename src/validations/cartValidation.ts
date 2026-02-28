/**
 * Cart Validation
 * Validate input cho giỏ hàng
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { INTEGER_ID_RULE } from '~/utils/zodValidators.js'

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/** Schema adding to cart */
const addToCart = async (
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
    quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0')
  })

  try {
    // Cho phép productId dạng string gửi lên, nhưng transform sang number nếu cần?
    // Zod parse sẽ handle type check.
    // Thực tế FE thường gửi JSON number.
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

/** Schema update quantity */
const updateCart = async (
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
    quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0')
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

/** Schema sync guest cart */
const syncCart = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = z.object({
    items: z
      .array(
        z.object({
          productId: z.union([
            z.number().int().positive(),
            z
              .string()
              .regex(INTEGER_ID_RULE)
              .transform((val) => parseInt(val, 10))
          ]),
          quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0')
        })
      )
      .min(1, 'Danh sách sản phẩm không được rỗng')
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

export const cartValidation = {
  addToCart,
  updateCart,
  syncCart
}
