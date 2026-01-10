/**
 * Validation type definitions
 * Types cho Joi validation schemas và middleware
 */

import type { Request, Response, NextFunction } from 'express'

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  message: string
  path: (string | number)[]
  type: string
  context?: Record<string, unknown>
}

/**
 * Validation result
 */
export interface ValidationResult<T> {
  error?: {
    details: ValidationErrorDetail[]
    message: string
  }
  value: T
}

/**
 * Async validation middleware function
 */
export type ValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

/**
 * Validation schema options
 */
export interface ValidationOptions {
  abortEarly?: boolean
  allowUnknown?: boolean
  stripUnknown?: boolean
}

/**
 * Register validation input
 */
export interface RegisterValidationInput {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone?: string
  address?: string
  dateOfBirth?: string | Date | null
  gender?: string
}

/**
 * Login validation input
 */
export interface LoginValidationInput {
  email: string
  password: string
}

/**
 * Update user validation input
 */
export interface UpdateUserValidationInput {
  name?: string
  phone?: string
  address?: string
  dateOfBirth?: string | Date | null
  gender?: string
}

/**
 * Update password validation input
 */
export interface UpdatePasswordValidationInput {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

/**
 * Product validation input
 */
export interface ProductValidationInput {
  name: string
  image: string
  type: string
  countInStock: number
  price: number
  description?: string
  discount?: number
}

/**
 * Order item validation input
 */
export interface OrderItemValidationInput {
  productId: string
  quantity: number
}

/**
 * Create order validation input
 */
export interface CreateOrderValidationInput {
  items: OrderItemValidationInput[]
  shippingAddress: {
    name: string
    phone: string
    address: string
    city: string
    province: string
    postalCode?: string
  }
  voucherCode?: string
  paymentMethod?: string
}

/**
 * Voucher validation input
 */
export interface VoucherValidationInput {
  code: string
  type: 'percent' | 'fixed'
  amount: number
  maxDiscount?: number
  minOrderValue?: number
  usageLimit?: number
  startDate?: string | Date
  endDate?: string | Date
  description?: string
}
