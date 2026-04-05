/**
 * Payment Validation
 * Xác thực dữ liệu đầu vào cho các API thanh toán.
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'

const paypalCreateOrderSchema = z.object({
  orderCode: z
    .string({ required_error: 'orderCode là bắt buộc' })
    .trim()
    .min(1, 'orderCode là bắt buộc')
    .max(50, 'orderCode không hợp lệ')
})

const paypalCaptureOrderSchema = z.object({
  orderCode: z
    .string({ required_error: 'orderCode là bắt buộc' })
    .trim()
    .min(1, 'orderCode là bắt buộc')
    .max(50, 'orderCode không hợp lệ'),
  paypalOrderId: z
    .string({ required_error: 'paypalOrderId là bắt buộc' })
    .trim()
    .min(1, 'paypalOrderId là bắt buộc')
    .max(120, 'paypalOrderId không hợp lệ')
})

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

const paypalCreateOrder = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = paypalCreateOrderSchema.safeParse(req.body)
  if (!result.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  }

  req.body = result.data
  next()
}

const paypalCaptureOrder = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = paypalCaptureOrderSchema.safeParse(req.body)
  if (!result.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  }

  req.body = result.data
  next()
}

export const paymentValidation = {
  paypalCreateOrder,
  paypalCaptureOrder
}
