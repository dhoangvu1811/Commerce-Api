/**
 * Multer Upload Middleware
 * Cấu hình multer để upload file
 */

import multer from 'multer'
import type { Request } from 'express'
import type { FileFilterCallback } from 'multer'
import { ALLOW_COMMON_FILE_TYPES } from '~/utils/zodValidators.js'

/**
 * Hàm kiểm tra loại file được phép upload
 */
const customFileFilter = (_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void => {
  // Kiểm tra mimetype có trong danh sách cho phép không
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
    const errorMessage = 'Loại file không được hỗ trợ. Vui lòng upload file ảnh (JPEG, PNG, GIF, WebP).'
    // Trả về lỗi nếu file không hợp lệ
    callback(new Error(errorMessage))

    return
  }

  // File hợp lệ
  callback(null, true)
}

/**
 * Cấu hình multer với memory storage
 * File sẽ được lưu tạm trong RAM trước khi upload lên cloud
 */
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: customFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  }
})

export const multerUploadMiddleware = {
  upload
}
