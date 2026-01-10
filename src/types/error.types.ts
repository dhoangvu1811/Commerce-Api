/**
 * API Error type definitions
 */

/**
 * Custom API Error class interface
 */
export interface IApiError extends Error {
  statusCode: number
  name: 'ApiError'
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  code: number
  message: string
  data: null
  stack?: string
}

/**
 * HTTP Status codes thường dùng
 */
export type HttpStatusCode =
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 406 // Not Acceptable
  | 409 // Conflict
  | 410 // Gone
  | 422 // Unprocessable Entity
  | 500 // Internal Server Error

/**
 * Common error messages
 */
export interface ErrorMessages {
  UNAUTHORIZED: string
  FORBIDDEN: string
  NOT_FOUND: string
  VALIDATION_ERROR: string
  INTERNAL_ERROR: string
  CONFLICT: string
}
