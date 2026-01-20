/**
 * Common type definitions used across the application
 */

/**
 * Cấu trúc phản hồi API chuẩn
 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}

/**
 * Thông tin phân trang
 */
export interface PaginationInfo {
  page: number
  itemsPerPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Kết quả có phân trang
 */
export type PaginatedResult<T, K extends string = 'items'> = {
  pagination: PaginationInfo
} & {
  [P in K]: T[]
}

/**
 * Sort options (legacy - kept for backward compatibility)
 */
export type SortOrder = 1 | -1
export type SortOptions = Record<string, SortOrder>

/**
 * Filter options (legacy - kept for backward compatibility)
 * Note: Prisma uses different filter structure
 */
export type FilterOptions = Record<string, unknown>

/**
 * ID string type helper (replaces ObjectIdString)
 * Used for API responses where IDs are strings
 */
export type ObjectIdString = string
export type IdString = string | number

/**
 * Document with _id (legacy - kept for backward compatibility)
 * Note: In Prisma, IDs are numbers, but API responses use strings
 */
export interface MongoDocument {
  _id?: IdString
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Base timestamp fields
 */
export interface Timestamps {
  createdAt: Date
  updatedAt: Date
}

/**
 * Request với JWT decoded
 */
export interface JwtDecodedPayload {
  _id: string
  email: string
  role: string
  sessionId?: string
  iat?: number
  exp?: number
}

/**
 * Device và IP info cho session tracking
 */
export interface DeviceInfo {
  deviceInfo: string
  ipAddress: string
}

/**
 * Generic upload result (Cloudinary hoặc tương tự)
 */
export interface UploadResult {
  secure_url: string
  public_id: string
  [key: string]: unknown
}

/**
 * Generic delete result
 */
export interface DeleteResultInfo {
  deletedCount: number
  message?: string
  deletedIds?: string[]
}
