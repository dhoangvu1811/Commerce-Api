/**
 * Permission Validation
 * Input validation schemas for Permission APIs
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'

/** Helper function để format Zod errors */
const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/** Schema for creating/updating permission */
const permissionSchema = z.object({
  name: z
    .string({ required_error: 'Tên permission là bắt buộc' })
    .min(2, 'Tên permission phải có ít nhất 2 ký tự')
    .max(100, 'Tên permission không được vượt quá 100 ký tự')
    .regex(
      /^[a-z_]+$/,
      'Tên permission chỉ được chứa chữ thường và dấu gạch dưới'
    ),
  displayName: z
    .string()
    .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
    .max(100, 'Tên hiển thị không được vượt quá 100 ký tự')
    .optional()
})

/** Schema for permission ID param */
const permissionIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Permission ID phải là số')
})

/** Validate create permission */
const createPermission = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    await permissionSchema.parseAsync(req.body)
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

/** Validate update permission */
const updatePermission = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    await permissionIdSchema.parseAsync(req.params)
    await permissionSchema.parseAsync(req.body)
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

/** Validate permission ID param */
const validatePermissionId = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    await permissionIdSchema.parseAsync(req.params)
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

export const permissionValidation = {
  createPermission,
  updatePermission,
  validatePermissionId
}
