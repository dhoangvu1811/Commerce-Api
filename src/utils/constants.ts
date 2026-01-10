/**
 * Application Constants
 * Các hằng số sử dụng trong ứng dụng
 */

import { env } from '~/config/environment.js'
import type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod
} from '~/types/order.types.js'

/**
 * Danh sách domains được phép CORS
 * Thêm domain vào đây khi deploy frontend
 */
export const WHITELIST_DOMAINS: string[] = ['http://localhost:5173']

/**
 * Domain website hiện tại dựa trên BUILD_MODE
 */
export const WEBSITE_DOMAIN: string =
  env.BUILD_MODE === 'production'
    ? env.WEBSITE_DOMAIN_PRODUCTION
    : env.WEBSITE_DOMAIN_DEVELOPMENT

/**
 * Các trạng thái của đơn hàng
 */
export const ORDER_STATUS: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED'
] as const

/**
 * Các trạng thái thanh toán
 */
export const PAYMENT_STATUS: readonly PaymentStatus[] = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED'
] as const

/**
 * Các phương thức thanh toán được phép
 */
export const ALLOWED_PAYMENT_METHODS: readonly PaymentMethod[] = [
  'COD',
  'CARD',
  'EWALLET',
  'BANK',
  'MOMO',
  'ZALOPAY',
  '' // Allow empty string for not specified
] as const
