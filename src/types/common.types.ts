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
 * Sort options cho MongoDB
 */
export type SortOrder = 1 | -1
export type SortOptions = Record<string, SortOrder>

/**
 * Filter options cho MongoDB queries
 */
export type FilterOptions = Record<string, unknown>

/**
 * ObjectId string type helper
 */
export type ObjectIdString = string

/**
 * MongoDB document with _id
 * Sử dụng ObjectIdString thay vì ObjectId để tránh import mongodb
 * Trong thực tế, _id có thể là ObjectId hoặc string tùy context
 */
export interface MongoDocument {
  _id?: ObjectIdString
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
 * Cấu trúc phản hồi lỗi
 */
export interface ErrorResponse {
  code: number
  message: string
  data: null
  stack?: string
}

/**
 * Device và IP info cho session tracking
 */
export interface DeviceInfo {
  deviceInfo: string
  ipAddress: string
}
