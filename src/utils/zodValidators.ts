/**
 * Zod Validators
 * Shared Zod schemas và utilities cho validation
 */

import { z } from 'zod'

/**
 * Schema cho MongoDB ObjectId (24 ký tự hex) - Legacy
 * Note: PostgreSQL uses integer IDs, but kept for backward compatibility
 */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Thông tin không hợp lệ. Vui lòng thử lại.')

/**
 * Schema cho PostgreSQL integer ID
 */
export const integerIdSchema = z
  .string()
  .regex(/^\d+$/, 'ID phải là số nguyên hợp lệ.')
  .transform((val) => parseInt(val, 10))

/**
 * Schema cho email hợp lệ
 */
export const emailSchema = z
  .string()
  .regex(/^\S+@\S+\.\S+$/, 'Email không hợp lệ. Ví dụ: ten@email.com')

/**
 * Schema cho password (8-256 ký tự, chữ + số)
 */
export const passwordSchema = z
  .string()
  .regex(
    /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d\W]{8,256}$/,
    'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái và số.'
  )

/**
 * Schema cho phone number
 */
export const phoneSchema = z
  .string()
  .regex(/^[0-9+\-\s()]+$/, 'Số điện thoại không hợp lệ')
  .min(10, 'Số điện thoại phải có ít nhất 10 ký tự')
  .max(15, 'Số điện thoại không được quá 15 ký tự')
  .or(z.literal(''))

/**
 * RegExp constants
 */
export const OBJECT_ID_RULE = /^[0-9a-fA-F]{24}$/ // Legacy MongoDB ObjectId (Deprecated)
// PostgreSQL integer ID rule (matches string containing only digits)
export const INTEGER_ID_RULE = /^\d+$/
export const ID_RULE = INTEGER_ID_RULE // Generic ID rule for PostgreSQL

export const EMAIL_RULE = /^\S+@\S+\.\S+$/
export const PASSWORD_RULE = /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d\W]{8,256}$/
export const PHONE_RULE = /^[0-9+\-\s()]+$/

/**
 * Error messages (để tương thích với code cũ)
 */
export const OBJECT_ID_RULE_MESSAGE =
  'Thông tin không hợp lệ. Vui lòng thử lại.'
export const ID_RULE_MESSAGE = 'ID không hợp lệ. ID phải là số nguyên.'
export const EMAIL_RULE_MESSAGE = 'Email không hợp lệ. Ví dụ: ten@email.com'
export const PASSWORD_RULE_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái và số.'
export const PHONE_RULE_MESSAGE = 'Số điện thoại không hợp lệ'
export const FIELD_REQUIRED_MESSAGE = 'Trường này là bắt buộc.'

/**
 * Giới hạn kích thước file upload (10MB)
 */
export const LIMIT_COMMON_FILE_SIZE = 10485760 // byte = 10 MB

/**
 * Các loại file được phép upload
 */
export const ALLOW_COMMON_FILE_TYPES: readonly string[] = [
  'image/jpg',
  'image/jpeg',
  'image/png'
]

/**
 * Schema cho date nullable - xử lý string/null/undefined
 * Dùng trong models để chấp nhận date dạng string từ request
 */
export const coerceDateNullable = z.preprocess((val) => {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)

  return val
}, z.date().nullable())

/**
 * Schema cho date required - xử lý string
 */
export const coerceDate = z.preprocess((val) => {
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)

  return val
}, z.date())
