/**
 * Order type definitions
 */

import type { Timestamps, PaginationInfo } from './common.types.js'
import {
  OrderStatus as PrismaOrderStatus,
  PaymentStatus as PrismaPaymentStatus,
  PaymentMethod as PrismaPaymentMethod,
  VoucherType as PrismaVoucherType
} from '../generated/prisma/index.js'

/**
 * Trạng thái đơn hàng (re-export from Prisma)
 */
export type OrderStatus = PrismaOrderStatus

/**
 * Trạng thái thanh toán (re-export from Prisma)
 */
export type PaymentStatus = PrismaPaymentStatus

/**
 * Phương thức thanh toán (re-export from Prisma)
 */
export type PaymentMethod = PrismaPaymentMethod

/**
 * Loại Voucher (re-export from Prisma)
 */
export type VoucherType = PrismaVoucherType

/**
 * Sản phẩm trong đơn hàng
 */
export interface OrderItem {
  productId: string
  name: string
  image: string
  unitPrice: number
  discount: number
  quantity: number
  lineTotal: number
}

/**
 * Địa chỉ giao hàng
 */
export interface ShippingAddress {
  id?: string | number
  name: string
  phone: string
  address: string
  city: string
  province: string
  postalCode?: string
  isDefault?: boolean
}

/**
 * Thông tin voucher áp dụng cho đơn hàng
 */
export interface OrderVoucher {
  voucherId?: string | number
  code: string
  type: VoucherType
  amount: number
  maxDiscount?: number
  discountApplied: number
}

/**
 * Alias cho VoucherSnapshot (dùng trong orderService)
 */
export type VoucherSnapshot = OrderVoucher

/**
 * Tổng tiền đơn hàng
 */
export interface OrderTotals {
  subtotal: number
  discount: number
  shippingFee: number
  payable: number
}

/**
 * Log entry cho đơn hàng
 */
export interface LogEntry {
  id?: number
  action: string
  performedById?: number | null
  performedByRole?: 'user' | 'admin' | 'system' | null
  at: Date
  note?: string | null
  fromStatus?: OrderStatus | null
  toStatus?: OrderStatus | null
  fromPaymentStatus?: PaymentStatus | null
  toPaymentStatus?: PaymentStatus | null
  meta?: any
}

/**
 * Payment entity (PostgreSQL/Prisma)
 */
export interface Payment {
  id: number
  orderId: number
  paymentMethod: PaymentMethod
  transactionId?: string | null
  value: number
  status: PaymentStatus
  paidAt?: Date | null
  createdAt: Date
}

/**
 * Order entity (PostgreSQL/Prisma)
 */
export interface Order extends Timestamps {
  id: number
  _id?: string | number // Alias for id
  userId: number
  orderCode: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  vouchers?: OrderVoucher[] // Changed to array if multiple allowed, or keep as snapshot
  totals: OrderTotals
  status: OrderStatus
  payments: Payment[] // Relation to Payment table
  logs: LogEntry[]
  deliveredAt: Date | null
}

/**
 * Input tạo đơn hàng mới
 */
export interface CreateOrderInput {
  items: Array<{
    productId: string
    quantity: number
  }>
  shippingAddress: ShippingAddress
  voucherCode?: string
  paymentMethod?: PaymentMethod
}

/**
 * Input cập nhật trạng thái đơn hàng
 */
export interface UpdateOrderStatusInput {
  status: OrderStatus
  note?: string
}

/**
 * Kết quả lấy danh sách orders
 */
export interface GetOrdersResult {
  orders: Order[]
  pagination: PaginationInfo & {
    totalOrders: number
  }
}

/**
 * Order item from payload (request body)
 */
export interface PayloadOrderItem {
  productId: string
  quantity: number
}

/**
 * Create order payload (từ request body)
 */
export interface CreateOrderPayload {
  items: PayloadOrderItem[]
  voucherCode?: string
  shippingAddress: ShippingAddress
  shippingFee?: number
  paymentMethod?: string
}

/**
 * Query filter for admin orders
 */
export interface AdminOrderQueryFilter {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  search?: string
}

// Note: OrderMongoFilter removed - no longer needed with Prisma

/**
 * Paginated orders result for model
 */
export interface PaginatedOrdersModelResult<T = Order> {
  orders: T[]
  pagination: PaginationInfo & {
    totalOrders: number
  }
}

/**
 * Update status data for order
 */
export interface UpdateStatusData {
  status: OrderStatus
}

/**
 * Update payment status data for order
 */
export interface UpdatePaymentStatusData {
  paymentStatus: PaymentStatus
}

/**
 * User info for logs
 */
export interface LogUserInfo {
  _id: string | number
  email: string
  displayName: string
  role: string
}

/**
 * Log with user info
 */
export interface LogWithUserInfo extends LogEntry {
  performedBy: LogUserInfo | null
}

/**
 * Order logs response
 */
export interface OrderLogsResponse {
  orderCode: string
  status: OrderStatus
  logs: LogWithUserInfo[]
}

/**
 * Update order input for model
 */
export interface UpdateOrderInput {
  status?: OrderStatus
  deliveredAt?: Date | null
  updatedAt?: Date
}
