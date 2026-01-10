/**
 * Error Handling Middleware
 * Middleware xử lý lỗi tập trung cho ứng dụng
 */

import type { Request, Response, NextFunction } from 'express'
import type { ErrorResponse } from '~/types/common.types.js'
import { env } from '~/config/environment.js'

/**
 * Middleware xử lý lỗi tập trung
 * Nhận lỗi từ các middleware/controller và trả về response chuẩn
 */
const errorHandlingMiddleware = (
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Mặc định statusCode là 500 nếu không có
  const statusCode = err.statusCode || 500

  // Mặc định message nếu không có
  const message = err.message || 'Internal Server Error'

  // Cấu trúc response chuẩn
  const responseError: ErrorResponse = {
    code: statusCode,
    message: message,
    data: null,
    // Chỉ trả về stack trace trong môi trường development
    stack: env.BUILD_MODE === 'dev' ? err.stack : undefined
  }

  res.status(statusCode).json(responseError)
}

export default errorHandlingMiddleware
