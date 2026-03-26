/**
 * Validation cho shipping APIs (GHN)
 */

import { z } from 'zod'
import type { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((item) => item.message).join(', ')
}

const districtSchema = z.object({
  provinceId: z.coerce.number().int().positive('provinceId không hợp lệ')
})

const wardSchema = z.object({
  districtId: z.coerce.number().int().positive('districtId không hợp lệ')
})

const serviceSchema = z.object({
  toDistrictId: z.coerce.number().int().positive('toDistrictId không hợp lệ')
})

const quoteSchema = z.object({
  toDistrictId: z.coerce.number().int().positive('toDistrictId không hợp lệ'),
  toWardCode: z.string().trim().min(1, 'toWardCode là bắt buộc'),
  serviceId: z.coerce.number().int().positive('Vui lòng chọn dịch vụ vận chuyển'),
  serviceTypeId: z.coerce.number().int().positive().optional(),
  insuranceValue: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().int().min(1).max(50000).optional(),
  length: z.coerce.number().int().min(1).max(200).optional(),
  width: z.coerce.number().int().min(1).max(200).optional(),
  height: z.coerce.number().int().min(1).max(200).optional(),
  codValue: z.coerce.number().min(0).max(5000000).optional(),
  codFailedAmount: z.coerce.number().min(0).optional(),
  coupon: z.string().max(50).nullable().optional()
})

const validateDistricts = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const result = districtSchema.safeParse(req.query)

  if (!result.success) {
    return next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, formatZodError(result.error)))
  }

  next()
}

const validateWards = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const result = wardSchema.safeParse(req.query)

  if (!result.success) {
    return next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, formatZodError(result.error)))
  }

  next()
}

const validateQuote = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const result = quoteSchema.safeParse(req.body)

  if (!result.success) {
    return next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, formatZodError(result.error)))
  }

  req.body = result.data
  next()
}

const validateServices = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const result = serviceSchema.safeParse(req.query)

  if (!result.success) {
    return next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, formatZodError(result.error)))
  }

  next()
}

export const shippingValidation = {
  validateDistricts,
  validateWards,
  validateServices,
  validateQuote
}
