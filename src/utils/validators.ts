/**
 * Validation Rules
 * Các quy tắc xác thực dữ liệu đầu vào
 */

// === Object ID Validation ===

/**
 * RegExp kiểm tra MongoDB ObjectId hợp lệ (24 ký tự hex)
 */
export const OBJECT_ID_RULE: RegExp = /^[0-9a-fA-F]{24}$/

/**
 * Thông báo lỗi khi ObjectId không hợp lệ
 */
export const OBJECT_ID_RULE_MESSAGE: string =
  'Thông tin không hợp lệ. Vui lòng thử lại.'

/**
 * Thông báo lỗi khi trường bắt buộc bị thiếu
 */
export const FIELD_REQUIRED_MESSAGE: string = 'Trường này là bắt buộc.'

// === Email Validation ===

/**
 * RegExp kiểm tra email hợp lệ
 */
export const EMAIL_RULE: RegExp = /^\S+@\S+\.\S+$/

/**
 * Thông báo lỗi khi email không hợp lệ
 */
export const EMAIL_RULE_MESSAGE: string =
  'Email không hợp lệ. Ví dụ: ten@email.com'

// === Password Validation ===

/**
 * RegExp kiểm tra password (8-256 ký tự, phải có cả chữ và số)
 */
export const PASSWORD_RULE: RegExp =
  /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d\W]{8,256}$/

/**
 * Thông báo lỗi khi password không hợp lệ
 */
export const PASSWORD_RULE_MESSAGE: string =
  'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái và số.'

// === File Validation ===

/**
 * Giới hạn kích thước file upload (10MB)
 */
export const LIMIT_COMMON_FILE_SIZE: number = 10485760 // byte = 10 MB

/**
 * Các loại file được phép upload
 */
export const ALLOW_COMMON_FILE_TYPES: readonly string[] = [
  'image/jpg',
  'image/jpeg',
  'image/png'
]
