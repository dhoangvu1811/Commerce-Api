/**
 * Cloudinary Provider
 * Xử lý upload file lên Cloudinary
 */

import cloudinary from 'cloudinary'
import type { UploadApiResponse } from 'cloudinary'
import streamifier from 'streamifier'
import { env } from '~/config/environment.js'

// Cấu hình cloudinary
const cloudinaryV2 = cloudinary.v2
cloudinaryV2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
})

/**
 * Upload file lên Cloudinary thông qua stream
 * @param {Buffer} fileBuffer - Buffer của file cần upload
 * @param {string} folderName - Tên folder trên Cloudinary
 * @returns {Promise<UploadApiResponse>} Kết quả upload
 */
const streamUpload = (
  fileBuffer: Buffer,
  folderName: string
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    // Tạo một luồng stream upload lên Cloudinary
    const stream = cloudinaryV2.uploader.upload_stream(
      { folder: folderName },
      (err, result) => {
        if (err) reject(err)
        else if (result) resolve(result)
        else reject(new Error('Upload failed: no result returned'))
      }
    )
    // Thực hiện upload luồng trên bằng lib streamifier
    streamifier.createReadStream(fileBuffer)?.pipe(stream)
  })
}

/**
 * Cloudinary Provider object chứa các methods
 */
export const CloudinaryProvider = {
  streamUpload
}
