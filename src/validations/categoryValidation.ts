/**
 * Category Validation
 * Xác thực dữ liệu đầu vào cho các API liên quan đến category
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { INTEGER_ID_RULE } from '~/utils/zodValidators.js'

/** Schema tạo category mới */
const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Tên danh mục là bắt buộc' })
    .min(2, 'Tên danh mục phải có ít nhất 2 ký tự')
    .max(100, 'Tên danh mục không được vượt quá 100 ký tự'),
  description: z
    .string()
    .max(1000, 'Mô tả không được vượt quá 1000 ký tự')
    .optional()
    .nullable(),
  image: z.string().url('Hình ảnh phải là URL hợp lệ').optional().nullable()
})

/** Schema cập nhật category */
const updateCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Tên danh mục phải có ít nhất 2 ký tự')
    .max(100, 'Tên danh mục không được vượt quá 100 ký tự')
    .optional(),
  description: z
    .string()
    .max(1000, 'Mô tả không được vượt quá 1000 ký tự')
    .optional()
    .nullable(),
  image: z.string().url('Hình ảnh phải là URL hợp lệ').optional().nullable()
})

// Schema xóa nhiều category
const deleteManyCategoriesSchema = z.object({
  ids: z
    .array(
      z.union([
        z.string().regex(INTEGER_ID_RULE, 'ID phải là số nguyên'),
        z.number().int().positive('ID phải là số dương')
      ])
    )
    .min(1, 'Cần chọn ít nhất 1 danh mục để xóa')
})

/** Schema xóa category */
const deleteCategorySchema = z.object({
  id: z.union([
    z.string().regex(INTEGER_ID_RULE, 'ID phải là số nguyên'),
    z.number().int().positive('ID phải là số dương')
  ])
})

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

const createNew = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = createCategorySchema.safeParse(req.body)
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

const update = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = updateCategorySchema.safeParse(req.body)
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

const checkCategoryId = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = deleteCategorySchema.safeParse(req.params)
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

const deleteMany = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = deleteManyCategoriesSchema.safeParse(req.body)
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

export const categoryValidation = {
  createNew,
  update,
  checkCategoryId,
  deleteCategory: checkCategoryId,
  deleteMany
}
