/**
 * Order type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps, PaginationInfo } from './common.types.js'

/**
 * Trạng thái đơn hàng
 */
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED'

/**
 * Trạng thái thanh toán
 */
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED'

/**
 * Phương thức thanh toán được phép
 */
export type PaymentMethod =
  | 'COD'
  | 'CARD'
  | 'EWALLET'
  | 'BANK'
  | 'MOMO'
  | 'ZALOPAY'
  | ''

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
  id?: string
  name: string
  phone: string
  address: string
  city: string
  province: string
  postalCode?: string
  isDefault?: boolean
  fullAddress?: string
}

/**
 * Thông tin voucher áp dụng cho đơn hàng
 */
export interface OrderVoucher {
  voucherId?: string
  code: string
  type: 'percent' | 'fixed'
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
  action: string
  by: string | null
  byRole: 'user' | 'admin' | 'system'
  at: Date
  note?: string
  fromStatus?: OrderStatus | null
  toStatus?: OrderStatus | null
  fromPaymentStatus?: PaymentStatus
  toPaymentStatus?: PaymentStatus
  meta?: Record<string, unknown>
}

/**
 * Order document trong MongoDB
 */
export interface Order extends Timestamps {
  _id?: ObjectId
  userId: string | ObjectId
  orderCode: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  voucher: OrderVoucher | null
  totals: OrderTotals
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: string
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

/**
 * MongoDB filter for orders
 */
export interface OrderMongoFilter {
  userId?: ObjectId
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  $or?: Array<{ [key: string]: { $regex: string; $options: string } }>
}

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
  _id: ObjectId
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
  paymentStatus: PaymentStatus
  logs: LogWithUserInfo[]
}

/**
 * Update order input for model
 */
export interface UpdateOrderInput {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  deliveredAt?: Date | null
  updatedAt?: Date
}
