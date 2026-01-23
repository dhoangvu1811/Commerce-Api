/**
 * Role Validation
 * Input validation schemas for Role APIs
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'

/** Helper function để format Zod errors */
const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/** Schema for creating/updating role */
const roleSchema = z.object({
  name: z
    .string({ required_error: 'Tên role là bắt buộc' })
    .min(2, 'Tên role phải có ít nhất 2 ký tự')
    .max(50, 'Tên role không được vượt quá 50 ký tự')
    .regex(/^[a-z_]+$/, 'Tên role chỉ được chứa chữ thường và dấu gạch dưới'),
  displayName: z
    .string()
    .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
    .max(100, 'Tên hiển thị không được vượt quá 100 ký tự')
    .optional()
})

/** Schema for role ID param */
const roleIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Role ID phải là số')
})

/** Schema for permission ID param */
const permissionIdSchema = z.object({
  permissionId: z.string().regex(/^\d+$/, 'Permission ID phải là số')
})

/** Schema for assigning permission */
const assignPermissionSchema = z.object({
  permissionId: z
    .number({ required_error: 'Permission ID là bắt buộc' })
    .int('Permission ID phải là số nguyên')
    .positive('Permission ID phải lớn hơn 0')
})

/** Validate create role */
const createRole = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    await roleSchema.parseAsync(req.body)
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

/** Validate update role */
const updateRole = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    await roleIdSchema.parseAsync(req.params)
    await roleSchema.parseAsync(req.body)
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

/** Validate role ID param */
const validateRoleId = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    await roleIdSchema.parseAsync(req.params)
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

/** Validate assign permission */
const assignPermission = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    await roleIdSchema.parseAsync(req.params)
    await assignPermissionSchema.parseAsync(req.body)
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

/** Validate remove permission */
const removePermission = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    await roleIdSchema.parseAsync(req.params)
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

/** Schema for bulk assigning permissions */
const bulkAssignPermissionsSchema = z.object({
  permissionIds: z
    .array(z.number().int().positive('Permission ID phải là số nguyên dương'), {
      required_error: 'Danh sách permission IDs là bắt buộc'
    })
    .min(1, 'Phải có ít nhất 1 permission ID')
})

/** Validate bulk assign permissions */
const bulkAssignPermissions = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    await roleIdSchema.parseAsync(req.params)
    await bulkAssignPermissionsSchema.parseAsync(req.body)
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

export const roleValidation = {
  createRole,
  updateRole,
  validateRoleId,
  assignPermission,
  bulkAssignPermissions,
  removePermission
}
