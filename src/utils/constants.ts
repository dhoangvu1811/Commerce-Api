/**
 * Application Constants
 * Các hằng số sử dụng trong ứng dụng
 */

import { env } from '~/config/environment.js'
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod
} from '@prisma/client'

const DEFAULT_LOCAL_ORIGINS: string[] = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001'
]

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/$/, '')

const configuredOrigins = [
  ...env.CORS_WHITELIST.split(',').map(normalizeOrigin),
  normalizeOrigin(env.WEBSITE_DOMAIN_DEVELOPMENT),
  normalizeOrigin(env.WEBSITE_DOMAIN_PRODUCTION)
].filter(Boolean)

/**
 * Danh sách domains được phép CORS
 * - Production: bắt buộc cấu hình qua env (CORS_WHITELIST, WEBSITE_DOMAIN_*)
 * - Development: tự thêm localhost để thuận tiện local dev
 */
export const WHITELIST_DOMAINS: string[] = Array.from(
  new Set(
    env.BUILD_MODE === 'production'
      ? configuredOrigins
      : [...configuredOrigins, ...DEFAULT_LOCAL_ORIGINS]
  )
)

/**
 * Domain website hiện tại dựa trên BUILD_MODE
 */
export const WEBSITE_DOMAIN: string =
  env.BUILD_MODE === 'production'
    ? env.WEBSITE_DOMAIN_PRODUCTION
    : env.WEBSITE_DOMAIN_DEVELOPMENT

/**
 * Các trạng thái của đơn hàng - match Prisma enum
 */
export const ORDER_STATUS = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED
] as const

/**
 * Các trạng thái thanh toán - match Prisma enum
 */
export const PAYMENT_STATUS = [
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
  PaymentStatus.PAID,
  PaymentStatus.FAILED,
  PaymentStatus.REFUNDED,
  PaymentStatus.CANCELLED
] as const

/**
 * Các phương thức thanh toán được phép - match Prisma enum
 */
export const ALLOWED_PAYMENT_METHODS = [
  PaymentMethod.COD,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.MOMO,
  PaymentMethod.VNPAY,
  PaymentMethod.ZALOPAY
] as const

/**
 * Phí vận chuyển tối đa (10 triệu VNĐ)
 */
export const MAX_SHIPPING_FEE = 10_000_000

/**
 * Tên hiển thị trạng thái đơn hàng (Tiếng Việt)
 */
export const ORDER_STATUS_NAMES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Chờ xác nhận',
  [OrderStatus.CONFIRMED]: 'Đã xác nhận',
  [OrderStatus.PROCESSING]: 'Đang xử lý',
  [OrderStatus.SHIPPING]: 'Đang giao hàng',
  [OrderStatus.DELIVERED]: 'Đã giao hàng',
  [OrderStatus.CANCELLED]: 'Đã hủy'
}

/**
 * Tên hiển thị trạng thái thanh toán (Tiếng Việt)
 */
export const PAYMENT_STATUS_NAMES: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'chưa thanh toán',
  [PaymentStatus.PROCESSING]: 'đang xử lý thanh toán',
  [PaymentStatus.PAID]: 'đã thanh toán',
  [PaymentStatus.FAILED]: 'thanh toán thất bại',
  [PaymentStatus.REFUNDED]: 'đã hoàn tiền',
  [PaymentStatus.CANCELLED]: 'đã hủy thanh toán'
}
