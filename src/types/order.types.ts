/**
 * Order type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps } from './common.types.js'

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
  pagination: {
    page: number
    itemsPerPage: number
    totalOrders: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
