/**
 * Shipping Address Validation
 * Validate input cho địa chỉ giao hàng
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { PHONE_RULE, PHONE_RULE_MESSAGE } from '~/utils/zodValidators.js'

// Helper format error
const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/** Schema tạo địa chỉ mới */
const createNew = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = z.object({
    fullName: z
      .string()
      .min(1, 'Họ tên là bắt buộc')
      .max(100, 'Họ tên tối đa 100 ký tự'),
    phone: z.string().regex(PHONE_RULE, PHONE_RULE_MESSAGE),
    address: z
      .string()
      .min(5, 'Địa chỉ chi tiết phải có ít nhất 5 ký tự')
      .max(500),
    city: z.string().min(1, 'Tỉnh/Thành phố là bắt buộc'),
    province: z.string().min(1, 'Quận/Huyện là bắt buộc'),
    postalCode: z.string().max(20).optional(),
    isDefault: z.boolean().optional()
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

/** Schema cập nhật địa chỉ */
const update = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = z.object({
    fullName: z.string().min(1).max(100).optional(),
    phone: z.string().regex(PHONE_RULE, PHONE_RULE_MESSAGE).optional(),
    address: z.string().min(5).max(500).optional(),
    city: z.string().min(1).optional(),
    province: z.string().min(1).optional(),
    postalCode: z.string().max(20).optional(),
    isDefault: z.boolean().optional()
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

export const shippingAddressValidation = {
  createNew,
  update
}
