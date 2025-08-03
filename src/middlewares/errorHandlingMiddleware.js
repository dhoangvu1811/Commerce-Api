/* eslint-disable no-unused-vars */
import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'

// Middleware xử lý lỗi tập trung trong ứng dụng Back-end NodeJS (ExpressJS)
export const errorHandlingMiddleware = (err, req, res, next) => {
  if (!err.statusCode) err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  const responseError = {
    code: err.statusCode,
    message: err.message || StatusCodes[err.statusCode],
    data: null
  }

  // Chỉ khi môi trường là DEV thì mới trả về Stack Trace để debug dễ dàng hơn
  if (env.BUILD_MODE === 'dev') {
    responseError.stack = err.stack
  }

  res.status(err.statusCode).json(responseError)
}
