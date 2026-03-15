/**
 * CORS Configuration
 * Cấu hình Cross-Origin Resource Sharing cho ứng dụng
 */

import type { CorsOptions } from 'cors'
import { StatusCodes } from 'http-status-codes'
import { WHITELIST_DOMAINS } from '~/utils/constants.js'
import ApiError from '~/utils/ApiError.js'

/**
 * Cấu hình CORS cho ứng dụng
 * - Development mode: Cho phép tất cả origin
 * - Production mode: Chỉ cho phép các domain trong whitelist
 */
export const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void
  ) {
    // Request không có Origin thường đến từ Postman hoặc server-to-server call.
    // CORS chỉ áp dụng cho browser, nên có thể cho phép các request này.
    if (!origin) {
      return callback(null, true)
    }

    // Kiểm tra xem origin có nằm trong danh sách WHITELIST_DOMAINS hay không
    if (origin && WHITELIST_DOMAINS.includes(origin)) {
      return callback(null, true)
    }

    // Cuối cùng nếu domain không được chấp nhận thì trả về lỗi
    return callback(
      new ApiError(
        StatusCodes.FORBIDDEN,
        `${origin || 'Origin không xác định'} không được phép bởi CORS Policy.`
      )
    )
  },

  // Some legacy browsers (IE11, various SmartTVs) choke on 204
  optionsSuccessStatus: 200,

  // CORS sẽ cho phép nhận cookies từ request
  credentials: true
}
