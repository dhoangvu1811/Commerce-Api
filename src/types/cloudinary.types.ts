/**
 * Cloudinary Provider type definitions
 */

/**
 * Kết quả upload từ Cloudinary
 */
export interface CloudinaryUploadResult {
  public_id: string
  version: number
  signature: string
  width: number
  height: number
  format: string
  resource_type: string
  created_at: string
  tags: string[]
  bytes: number
  type: string
  etag: string
  placeholder: boolean
  url: string
  secure_url: string
  folder: string
  original_filename: string
  api_key: string
}

/**
 * Options cho upload
 */
export interface CloudinaryUploadOptions {
  folder?: string
  resource_type?: 'image' | 'video' | 'raw' | 'auto'
  public_id?: string
  overwrite?: boolean
  transformation?: CloudinaryTransformation[]
}

/**
 * Transformation options
 */
export interface CloudinaryTransformation {
  width?: number
  height?: number
  crop?: string
  quality?: string | number
  format?: string
}

/**
 * Cloudinary Provider interface
 */
export interface ICloudinaryProvider {
  streamUpload: (fileBuffer: Buffer, folderName: string) => Promise<CloudinaryUploadResult>
}
