/**
 * Voucher Validation
 * Xác thực dữ liệu đầu vào cho các API liên quan đến voucher
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { ID_RULE, ID_RULE_MESSAGE } from '~/utils/zodValidators.js'

/** Helper để xử lý date nullable - chấp nhận string từ FE */
const nullableDateSchema = z.preprocess((val) => {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return val
}, z.date().nullable())

/** Schema tạo voucher mới */
const createVoucherSchema = z.object({
  code: z
    .string({ required_error: 'Mã voucher là bắt buộc' })
    .min(3, 'Mã voucher phải có ít nhất 3 ký tự')
    .max(50, 'Mã voucher không được vượt quá 50 ký tự')
    .regex(
      /^[A-Z0-9-_]+$/,
      'Mã voucher chỉ gồm A-Z, 0-9, gạch ngang hoặc gạch dưới'
    ),
  type: z.enum(['percent', 'fixed'], {
    required_error: 'Loại voucher là bắt buộc',
    invalid_type_error: 'Loại voucher phải là percent hoặc fixed'
  }),
  amount: z
    .number({ required_error: 'Giá trị giảm là bắt buộc' })
    .positive('Giá trị giảm phải lớn hơn 0'),
  maxDiscount: z.number().min(0, 'Giảm tối đa không được âm').optional(),
  minOrderValue: z
    .number()
    .min(0, 'Giá trị đơn tối thiểu không được âm')
    .optional(),
  usageLimit: z
    .number()
    .int()
    .min(0, 'Giới hạn sử dụng không được âm')
    .optional(),
  usedCount: z
    .number()
    .int()
    .min(0, 'Số lần đã sử dụng không được âm')
    .optional(),
  startDate: nullableDateSchema.optional(),
  endDate: nullableDateSchema.optional(),
  isActive: z.boolean().optional()
})

/** Schema cập nhật voucher (tất cả optional, phải có ít nhất 1 field) */
const updateVoucherSchema = z
  .object({
    code: z
      .string()
      .min(3, 'Mã voucher phải có ít nhất 3 ký tự')
      .max(50, 'Mã voucher không được vượt quá 50 ký tự')
      .regex(
        /^[A-Z0-9-_]+$/,
        'Mã voucher chỉ gồm A-Z, 0-9, gạch ngang hoặc gạch dưới'
      )
      .optional(),
    type: z.enum(['percent', 'fixed']).optional(),
    amount: z.number().positive('Giá trị giảm phải lớn hơn 0').optional(),
    maxDiscount: z.number().min(0).optional(),
    minOrderValue: z.number().min(0).optional(),
    usageLimit: z.number().int().min(0).optional(),
    usedCount: z.number().int().min(0).optional(),
    startDate: nullableDateSchema.optional(),
    endDate: nullableDateSchema.optional(),
    isActive: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất 1 trường để cập nhật'
  })

/** Schema xóa voucher */
const deleteVoucherSchema = z.object({
  id: z
    .string({ required_error: 'ID voucher là bắt buộc' })
    .regex(ID_RULE, ID_RULE_MESSAGE)
})

/** Schema xác minh voucher */
const verifyVoucherSchema = z.object({
  code: z
    .string({ required_error: 'Mã voucher là bắt buộc' })
    .min(1, 'Mã voucher không được để trống'),
  orderTotal: z
    .number({ required_error: 'Tổng đơn là bắt buộc' })
    .min(0, 'Tổng đơn không được âm')
})

/** Schema xóa nhiều vouchers */
const deleteMultipleSchema = z.object({
  voucherIds: z
    .array(z.string().regex(ID_RULE, ID_RULE_MESSAGE), {
      required_error: 'Danh sách ID voucher là bắt buộc'
    })
    .min(1, 'Phải chọn ít nhất 1 voucher để xóa')
})

/**
 * Helper function để format Zod errors
 */
const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/**
 * Validation tạo voucher mới
 */
const createNew = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = createVoucherSchema.safeParse(req.body)
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

/**
 * Validation cập nhật voucher
 */
const update = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = updateVoucherSchema.safeParse(req.body)
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

/**
 * Validation xóa voucher
 */
const deleteVoucher = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = deleteVoucherSchema.safeParse(req.params)
  if (!result.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  }
  next()
}

/**
 * Validation xác minh voucher
 */
const verify = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = verifyVoucherSchema.safeParse(req.body)
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

/**
 * Validation xóa nhiều vouchers
 */
const deleteMultiple = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = deleteMultipleSchema.safeParse(req.body)
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

export const voucherValidation = {
  createNew,
  update,
  deleteVoucher,
  verify,
  deleteMultiple
}
