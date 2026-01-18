/**
 * Application Constants
 * Các hằng số sử dụng trong ứng dụng
 */

import { env } from '~/config/environment.js'
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod
} from '~/generated/prisma/index.js'

/**
 * Danh sách domains được phép CORS
 * Thêm domain vào đây khi deploy frontend
 */
export const WHITELIST_DOMAINS: string[] = [
  'http://localhost:5173',
  'http://localhost:3000'
]

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
