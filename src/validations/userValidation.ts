/**
 * User Validation
 * Xác thực dữ liệu đầu vào cho các API liên quan đến user
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import {
  ID_RULE,
  ID_RULE_MESSAGE,
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE
} from '~/utils/zodValidators.js'

/** Helper function để format Zod errors */
const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/** Phone regex */
const PHONE_RULE = /^[0-9+\-\s()]+$/

/** Helper để xử lý date nullable - chấp nhận string từ FE */
const nullableDateSchema = z
  .preprocess((val) => {
    if (val === null || val === undefined || val === '') return null
    if (val instanceof Date) return val
    if (typeof val === 'string') return new Date(val)

    return val
  }, z.date().nullable())
  .refine(
    (date) => {
      if (date === null) return true

      return date <= new Date()
    },
    { message: 'Ngày sinh không được lớn hơn ngày hiện tại' }
  )

/** Schema đăng ký tài khoản */
const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Tên là bắt buộc' })
      .min(2, 'Tên phải có ít nhất 2 ký tự')
      .max(100, 'Tên không được vượt quá 100 ký tự'),
    email: z
      .string({ required_error: 'Email là bắt buộc' })
      .regex(EMAIL_RULE, EMAIL_RULE_MESSAGE)
      .transform((val) => val.toLowerCase().trim()),
    password: z
      .string({ required_error: 'Mật khẩu là bắt buộc' })
      .regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE),
    confirmPassword: z.string({
      required_error: 'Xác nhận mật khẩu là bắt buộc'
    }),
    phoneNumber: z
      .string()
      .regex(PHONE_RULE, 'Số điện thoại không đúng định dạng')
      .min(10, 'Số điện thoại phải có ít nhất 10 ký tự')
      .max(15, 'Số điện thoại không được vượt quá 15 ký tự')
      .or(z.literal(''))
      .optional(),
    address: z
      .string()
      .max(500, 'Địa chỉ không được vượt quá 500 ký tự')
      .optional(),
    dateOfBirth: nullableDateSchema.optional(),
    gender: z.enum(['male', 'female', 'other', '']).optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmPassword']
  })

/** Schema đăng nhập */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .regex(EMAIL_RULE, EMAIL_RULE_MESSAGE)
    .transform((val) => val.toLowerCase().trim()),
  password: z.string({ required_error: 'Mật khẩu là bắt buộc' }),
  loginContext: z.enum(['admin', 'client']).optional()
})

/** Schema cập nhật user (tất cả optional, phải có ít nhất 1 field) */
const updateUserSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Tên phải có ít nhất 2 ký tự')
      .max(100, 'Tên không được vượt quá 100 ký tự')
      .optional(),
    email: z
      .string()
      .regex(EMAIL_RULE, EMAIL_RULE_MESSAGE)
      .transform((val) => val.toLowerCase().trim())
      .optional(),
    phoneNumber: z
      .string()
      .regex(PHONE_RULE, 'Số điện thoại không đúng định dạng')
      .min(10, 'Số điện thoại phải có ít nhất 10 ký tự')
      .max(15, 'Số điện thoại không được vượt quá 15 ký tự')
      .or(z.literal(''))
      .optional(),
    address: z
      .string()
      .max(500, 'Địa chỉ không được vượt quá 500 ký tự')
      .or(z.literal(''))
      .optional(),
    avatar: z
      .string()
      .url('Avatar phải là URL hợp lệ')
      .or(z.literal(''))
      .optional(),
    dateOfBirth: nullableDateSchema.optional(),
    gender: z.enum(['male', 'female', 'other', '']).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất 1 trường để cập nhật'
  })

/** Schema đổi mật khẩu */
const updatePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string({ required_error: 'Mật khẩu mới là bắt buộc' })
      .regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE),
    confirmPassword: z.string({
      required_error: 'Xác nhận mật khẩu là bắt buộc'
    })
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmPassword']
  })

/** Schema xóa user */
const deleteUserSchema = z.object({
  id: z
    .string({ required_error: 'ID người dùng là bắt buộc' })
    .regex(ID_RULE, ID_RULE_MESSAGE)
})

/** Schema xóa nhiều users */
const deleteMultipleUsersSchema = z.object({
  userIds: z
    .array(
      z.union([
        z.string().regex(ID_RULE, ID_RULE_MESSAGE),
        z.number().int().positive()
      ]),
      {
        required_error: 'Danh sách ID người dùng là bắt buộc'
      }
    )
    .min(1, 'Phải chọn ít nhất 1 người dùng để xóa')
})

/** Schema cập nhật user bởi admin (phải có ít nhất 1 field) */
const updateUserByAdminSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    email: z
      .string()
      .regex(EMAIL_RULE, EMAIL_RULE_MESSAGE)
      .transform((val) => val.toLowerCase().trim())
      .optional(),
    phoneNumber: z
      .string()
      .regex(PHONE_RULE)
      .min(10)
      .max(15)
      .or(z.literal(''))
      .optional(),
    address: z.string().max(500).or(z.literal('')).optional(),
    avatar: z.string().url().or(z.literal('')).optional(),
    dateOfBirth: nullableDateSchema.optional(),
    gender: z.enum(['male', 'female', 'other', '']).optional(),
    roleId: z.number().int().positive().optional(),
    role: z.string().optional(), // Legacy: support string name
    status: z.enum(['active', 'inactive']).optional(),
    emailVerified: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Vui lòng cung cấp ít nhất 1 trường để cập nhật'
  })

/** Schema tạo user bởi admin */
const createUserByAdminSchema = z.object({
  name: z.string({ required_error: 'Tên là bắt buộc' }).min(2).max(100),
  avatar: z.string().url().or(z.literal('')).optional(),
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .regex(EMAIL_RULE, EMAIL_RULE_MESSAGE)
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Mật khẩu là bắt buộc' })
    .regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE),
  phoneNumber: z
    .string()
    .regex(PHONE_RULE)
    .min(10)
    .max(15)
    .or(z.literal(''))
    .optional(),
  address: z.string().max(500).or(z.literal('')).optional(),
  dateOfBirth: nullableDateSchema.optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  roleId: z.number().int().positive().optional(),
  role: z.string().optional(), // Legacy
  status: z.enum(['active', 'inactive']).default('active').optional(),
  emailVerified: z.boolean().default(false).optional()
})

/** Schema user activation */
const userActivationSchema = z.object({
  userId: z
    .string({ required_error: 'User ID là bắt buộc' })
    .regex(ID_RULE, ID_RULE_MESSAGE)
})

/** Schema gửi email xác minh */
const sendVerificationEmailSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .regex(EMAIL_RULE, EMAIL_RULE_MESSAGE)
    .transform((val) => val.toLowerCase().trim())
})

/** Schema xác minh tài khoản */
const verifyUserAccountSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .regex(EMAIL_RULE, EMAIL_RULE_MESSAGE)
    .transform((val) => val.toLowerCase().trim()),
  token: z.string({ required_error: 'Token xác minh là bắt buộc' })
})

/** Schema thu hồi session */
const revokeSessionSchema = z.object({
  sessionId: z
    .string({ required_error: 'SessionId là bắt buộc' })
    .min(1, 'SessionId không được để trống')
})

/** Schema thu hồi tất cả sessions / lấy sessions */
const userIdParamSchema = z.object({
  userId: z
    .string({ required_error: 'UserId là bắt buộc' })
    .regex(ID_RULE, ID_RULE_MESSAGE)
})

// ============ Middleware Functions ============

const register = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = registerSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const login = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const updateUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = updateUserSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const updatePassword = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = updatePasswordSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const deleteUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = deleteUserSchema.safeParse(req.params)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  next()
}

const deleteMultipleUsers = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = deleteMultipleUsersSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const updateUserByAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = updateUserByAdminSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const createUserByAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = createUserByAdminSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const userActivation = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = userActivationSchema.safeParse(req.params)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  next()
}

const sendVerificationEmail = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = sendVerificationEmailSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const verifyUserAccount = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = verifyUserAccountSchema.safeParse(req.query)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  next()
}

const revokeSession = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = revokeSessionSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

const revokeAllSessions = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = userIdParamSchema.safeParse(req.params)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  next()
}

const getUserSessions = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = userIdParamSchema.safeParse(req.params)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  next()
}

const revokeMySession = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = revokeSessionSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

/** Schema thay đổi role của user */
const changeUserRoleSchema = z.object({
  roleId: z
    .number({ required_error: 'Role ID là bắt buộc' })
    .int('Role ID phải là số nguyên')
    .positive('Role ID phải lớn hơn 0')
})

/** Middleware validate thay đổi role */
const changeUserRole = (req: Request, _res: Response, next: NextFunction) => {
  const result = changeUserRoleSchema.safeParse(req.body)
  if (!result.success)
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  req.body = result.data
  next()
}

export const userValidation = {
  register,
  login,
  updateUser,
  updatePassword,
  deleteUser,
  deleteMultipleUsers,
  updateUserByAdmin,
  createUserByAdmin,
  userActivation,
  sendVerificationEmail,
  verifyUserAccount,
  revokeSession,
  revokeAllSessions,
  getUserSessions,
  revokeMySession,
  changeUserRole
}
