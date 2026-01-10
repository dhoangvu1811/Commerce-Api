/**
 * Custom API Error Class
 * Extends Error với statusCode để xử lý lỗi HTTP
 */

import type { IApiError } from '~/types/error.types.js'

/**
 * Custom Error class cho API
 * @extends Error
 */
class ApiError extends Error implements IApiError {
  /** HTTP Status Code của lỗi */
  statusCode: number

  /** Tên error class */
  name: 'ApiError' = 'ApiError'

  /**
   * Tạo ApiError instance
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Thông báo lỗi
   */
  constructor(statusCode: number, message: string) {
    super(message)

    // Gán HTTP status code
    this.statusCode = statusCode

    // Ghi lại Stack Trace để thuận tiện cho việc debug
    Error.captureStackTrace(this, this.constructor)
  }
}

export default ApiError
