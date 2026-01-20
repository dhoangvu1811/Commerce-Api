/**
 * Product Validation
 * Xác thực dữ liệu đầu vào cho các API liên quan đến product
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { ID_RULE, ID_RULE_MESSAGE } from '~/utils/zodValidators.js'

/** Schema tạo product mới */
const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Tên sản phẩm là bắt buộc' })
    .min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự')
    .max(255, 'Tên sản phẩm không được vượt quá 255 ký tự'),
  image: z
    .string({ required_error: 'Hình ảnh sản phẩm là bắt buộc' })
    .url('Hình ảnh phải là URL hợp lệ'),
  type: z
    .string({ required_error: 'Loại sản phẩm là bắt buộc' })
    .min(2, 'Loại sản phẩm phải có ít nhất 2 ký tự')
    .max(100, 'Loại sản phẩm không được vượt quá 100 ký tự'),
  countInStock: z
    .number({ required_error: 'Số lượng tồn kho là bắt buộc' })
    .int('Số lượng tồn kho phải là số nguyên')
    .min(0, 'Số lượng tồn kho không được âm'),
  price: z
    .number({ required_error: 'Giá sản phẩm là bắt buộc' })
    .positive('Giá sản phẩm phải lớn hơn 0'),
  rating: z
    .number()
    .min(0, 'Đánh giá phải từ 0 đến 5')
    .max(5, 'Đánh giá phải từ 0 đến 5')
    .optional()
    .default(0),
  description: z
    .string()
    .max(1000, 'Mô tả không được vượt quá 1000 ký tự')
    .optional()
    .default(''),
  selled: z
    .number()
    .int('Số lượng đã bán phải là số nguyên')
    .min(0, 'Số lượng đã bán không được âm')
    .optional()
    .default(0),
  discount: z
    .number()
    .min(0, 'Giảm giá không được âm')
    .max(100, 'Giảm giá không được vượt quá 100%')
    .optional()
    .default(0)
})

/** Schema cập nhật product (tất cả optional, nhưng phải có ít nhất 1 field) */
const updateProductSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự')
      .max(255, 'Tên sản phẩm không được vượt quá 255 ký tự')
      .optional(),
    image: z.string().url('Hình ảnh phải là URL hợp lệ').optional(),
    type: z
      .string()
      .min(2, 'Loại sản phẩm phải có ít nhất 2 ký tự')
      .max(100, 'Loại sản phẩm không được vượt quá 100 ký tự')
      .optional(),
    countInStock: z
      .number()
      .int('Số lượng tồn kho phải là số nguyên')
      .min(0, 'Số lượng tồn kho không được âm')
      .optional(),
    price: z.number().positive('Giá sản phẩm phải lớn hơn 0').optional(),
    rating: z
      .number()
      .min(0, 'Đánh giá phải từ 0 đến 5')
      .max(5, 'Đánh giá phải từ 0 đến 5')
      .optional(),
    description: z
      .string()
      .max(1000, 'Mô tả không được vượt quá 1000 ký tự')
      .optional(),
    selled: z
      .number()
      .int('Số lượng đã bán phải là số nguyên')
      .min(0, 'Số lượng đã bán không được âm')
      .optional(),
    discount: z
      .number()
      .min(0, 'Giảm giá không được âm')
      .max(100, 'Giảm giá không được vượt quá 100%')
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất 1 trường để cập nhật'
  })

/** Schema xóa product theo ID */
const deleteProductSchema = z.object({
  id: z
    .string({ required_error: 'ID sản phẩm là bắt buộc' })
    .regex(ID_RULE, ID_RULE_MESSAGE)
})

/** Schema xóa nhiều products */
const deleteSelectedSchema = z.object({
  productIds: z
    .array(z.string().regex(ID_RULE, ID_RULE_MESSAGE), {
      required_error: 'Danh sách ID sản phẩm là bắt buộc'
    })
    .min(1, 'Phải chọn ít nhất một sản phẩm để xóa')
})

/**
 * Helper function để format Zod errors
 */
const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/**
 * Validation tạo product mới
 */
const createNew = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = createProductSchema.safeParse(req.body)
  if (!result.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  }
  // Gán data đã parse vào req.body
  req.body = result.data
  next()
}

/**
 * Validation cập nhật product
 */
const update = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = updateProductSchema.safeParse(req.body)
  if (!result.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  }
  // Gán data đã parse vào req.body
  req.body = result.data
  next()
}

/**
 * Validation xóa product
 */
const deleteProduct = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = deleteProductSchema.safeParse(req.params)
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
 * Validation xóa nhiều products
 */
const deleteSelected = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = deleteSelectedSchema.safeParse(req.body)
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

export const productValidation = {
  createNew,
  update,
  deleteProduct,
  deleteSelected
}
