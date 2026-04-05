/**
 * Helper Functions
 * Các hàm tiện ích cho business logic - Prisma Version
 */

import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  VoucherType
} from '@prisma/client'
import type { Order } from '~/types/order.types.js'
import type { Voucher } from '~/types/voucher.types.js'

/** Định nghĩa valid transitions cho order status */
type OrderStatusTransitions = Record<OrderStatus, readonly OrderStatus[]>

const validOrderStatusTransitions: OrderStatusTransitions = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], // final for success
  [OrderStatus.CANCELLED]: [] // final for failure
}

/**
 * Kiểm tra chuyển đổi trạng thái đơn hàng hợp lệ
 */
export const isValidStatusTransition = (
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean => {
  return validOrderStatusTransitions[fromStatus]?.includes(toStatus) || false
}

/** Định nghĩa valid transitions cho payment status */
type PaymentStatusTransitions = Record<PaymentStatus, readonly PaymentStatus[]>

const validPaymentStatusTransitions: PaymentStatusTransitions = {
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED
  ],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED
  ],
  [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
  [PaymentStatus.FAILED]: [PaymentStatus.PENDING, PaymentStatus.CANCELLED],
  [PaymentStatus.REFUNDED]: [],
  [PaymentStatus.CANCELLED]: []
}

/**
 * Kiểm tra chuyển đổi trạng thái thanh toán hợp lệ
 */
export const isValidPaymentStatusTransition = (
  fromPaymentStatus: PaymentStatus,
  toPaymentStatus: PaymentStatus
): boolean => {
  return (
    validPaymentStatusTransitions[fromPaymentStatus]?.includes(
      toPaymentStatus
    ) || false
  )
}

/**
 * Kiểm tra có phải phương thức COD không
 */
export const isCODPayment = (paymentMethod: string = ''): boolean => {
  if (paymentMethod === PaymentMethod.COD) return true
  const method = paymentMethod.toLowerCase()

  return method === 'cod' || method.includes('cod') || method.includes('cash')
}

/**
 * Kiểm tra có phải thanh toán Online không
 */
export const isOnlinePayment = (paymentMethod: string = ''): boolean => {
  if (
    (
      [
        PaymentMethod.VNPAY,
        PaymentMethod.MOMO,
        PaymentMethod.ZALOPAY,
        PaymentMethod.BANK_TRANSFER,
        PaymentMethod.PAYPAL
      ] as PaymentMethod[]
    ).includes(paymentMethod as PaymentMethod)
  ) {
    return true
  }

  const method = paymentMethod.toLowerCase()

  return (
    [
      'card',
      'ewallet',
      'bank',
      'credit',
      'debit',
      'momo',
      'zalopay',
      'vnpay',
      'paypal'
    ].some((keyword) => method.includes(keyword)) ||
    (!isCODPayment(paymentMethod) && paymentMethod.trim() !== '')
  )
}

/** Kết quả kiểm tra cập nhật status */
interface StatusUpdateResult {
  allowed: boolean
  reason: string | null
  note?: string
}

/**
 * Kiểm tra có thể update status hay không dựa trên payment method
 */
export const canUpdateStatus = (
  order: Order | null,
  newStatus: OrderStatus
): StatusUpdateResult => {
  if (!order) return { allowed: false, reason: 'Đơn hàng không tồn tại' }

  const latestPayment = order.payments?.[0]
  const paymentStatus = latestPayment?.status || PaymentStatus.PENDING
  const paymentMethod = latestPayment?.paymentMethod || ''

  // Các status không cần kiểm tra payment
  const freeStatusUpdates: readonly OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED
  ]
  if (freeStatusUpdates.includes(newStatus)) {
    return { allowed: true, reason: null }
  }

  // COD: Có thể update status mà không cần markPaid trước
  if (isCODPayment(paymentMethod)) {
    return {
      allowed: true,
      reason: null,
      note: 'COD - Không cần thanh toán trước'
    }
  }

  // Online Payment: Phải markPaid trước mới được update status (except for PENDING/CONFIRMED)
  if (isOnlinePayment(paymentMethod)) {
    const requiresPaymentStatuses: readonly OrderStatus[] = [
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED
    ]

    if (
      requiresPaymentStatuses.includes(newStatus) &&
      paymentStatus !== PaymentStatus.PAID
    ) {
      const statusNames: Record<string, string> = {
        [OrderStatus.PROCESSING]: 'Đang xử lý',
        [OrderStatus.SHIPPING]: 'Đang giao hàng',
        [OrderStatus.DELIVERED]: 'Đã giao hàng'
      }
      const statusName = statusNames[newStatus] || newStatus

      return {
        allowed: false,
        reason: `Đơn hàng thanh toán online cần được thanh toán trước khi chuyển sang trạng thái "${statusName}"`
      }
    }
  }

  return { allowed: true, reason: null }
}

/**
 * Kiểm tra tính nhất quán giữa status và paymentStatus
 */
export const isConsistentStatusPayment = (
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  paymentMethod: string = ''
): boolean => {
  // Các quy tắc nhất quán
  const rules: Array<() => boolean> = [
    // Rule 1: Nếu đã PAID thì status phải >= CONFIRMED
    () =>
      paymentStatus === PaymentStatus.PAID
        ? !([OrderStatus.PENDING] as OrderStatus[]).includes(status)
        : true,

    // Rule 2: REFUNDED logic
    () =>
      paymentStatus === PaymentStatus.REFUNDED
        ? [OrderStatus.CANCELLED as OrderStatus].includes(status)
        : true,

    // Rule 3: Online Payment logic - Phải PAID trước khi PROCESSING/SHIPPING/DELIVERED
    () => {
      if (isOnlinePayment(paymentMethod)) {
        const requiresPaymentStatuses: readonly OrderStatus[] = [
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPING,
          OrderStatus.DELIVERED
        ]
        if (
          (requiresPaymentStatuses as OrderStatus[]).includes(status) &&
          paymentStatus === PaymentStatus.PENDING
        ) {
          return false
        }
      }

      return true
    }
  ]

  return rules.every((rule) => rule())
}

/**
 * Tính tổng tiền theo line item
 */
export const calcLineTotal = (
  price: number | string,
  discount: number | string | null | undefined,
  quantity: number | string
): number => {
  const unitPrice = Number(price)
  const disc = Number(discount || 0)
  const qty = Number(quantity)
  const afterDiscount = disc > 0 ? unitPrice * (1 - disc / 100) : unitPrice

  return Math.max(0, Number((afterDiscount * qty).toFixed(2)))
}

/** Kết quả áp dụng voucher */
interface VoucherApplyResult {
  discount: number
}

/**
 * Áp dụng voucher vào đơn hàng
 */
export const applyVoucher = (
  voucher: Voucher | null | undefined,
  subtotal: number | string
): VoucherApplyResult => {
  if (!voucher) return { discount: 0 }

  let discount = 0
  const subtotalNum = Number(subtotal)

  if (voucher.type === VoucherType.percent) {
    discount = (subtotalNum * Number(voucher.amount)) / 100
    if (voucher.maxDiscount && discount > Number(voucher.maxDiscount)) {
      discount = Number(voucher.maxDiscount)
    }
  } else {
    discount = Number(voucher.amount)
  }

  if (discount > subtotalNum) discount = subtotalNum

  return { discount }
}

/**
 * Tạo mã đơn hàng ngẫu nhiên
 */
export const generateOrderCode = (): string => {
  const timestamp = Date.now().toString().slice(-6) // Lấy 6 số cuối của timestamp
  const random = Math.random().toString(36).substring(2, 8).toUpperCase() // 6 ký tự random

  return `ORD${timestamp}${random}`
}

/**
 * Kiểm tra có thể đánh dấu đã thanh toán hay không
 */
export const canMarkPaid = (
  order: Order | null,
  isAdmin: boolean = false
): StatusUpdateResult => {
  if (!order) return { allowed: false, reason: 'Đơn hàng không tồn tại' }

  const latestPayment = order.payments?.[0]
  const status = order.status
  const paymentStatus = latestPayment?.status || PaymentStatus.PENDING
  const paymentMethod = latestPayment?.paymentMethod || ''

  // Chỉ admin mới có thể mark paid
  if (!isAdmin) {
    return {
      allowed: false,
      reason: 'Chỉ quản trị viên mới có thể xác nhận thanh toán'
    }
  }

  // Không thể mark paid nếu đã cancelled
  if (status === OrderStatus.CANCELLED) {
    return {
      allowed: false,
      reason: 'Không thể xác nhận thanh toán cho đơn hàng đã hủy'
    }
  }

  // Không thể mark paid nếu payment đã refunded/cancelled
  if (
    (
      [PaymentStatus.REFUNDED, PaymentStatus.CANCELLED] as PaymentStatus[]
    ).includes(paymentStatus)
  ) {
    const paymentStatusNames: Record<string, string> = {
      REFUNDED: 'đã hoàn tiền',
      CANCELLED: 'đã hủy thanh toán'
    }
    const paymentStatusName = paymentStatusNames[paymentStatus] || paymentStatus

    return {
      allowed: false,
      reason: `Không thể xác nhận thanh toán khi đơn hàng ${paymentStatusName}`
    }
  }

  // Đã thanh toán rồi
  if (paymentStatus === PaymentStatus.PAID) {
    return {
      allowed: false,
      reason: 'Đơn hàng đã được thanh toán rồi'
    }
  }

  // Logic đặc biệt cho COD: Có thể mark paid ngay cả khi DELIVERED
  if (isCODPayment(paymentMethod) && status === OrderStatus.DELIVERED) {
    return {
      allowed: true,
      reason: null,
      note: 'COD - Thanh toán khi nhận hàng'
    }
  }

  // Với Online Payment: Không được mark paid nếu đã DELIVERED (phải thanh toán trước)
  if (isOnlinePayment(paymentMethod) && status === OrderStatus.DELIVERED) {
    return {
      allowed: false,
      reason:
        'Đơn hàng thanh toán online phải được thanh toán trước khi giao hàng'
    }
  }

  return { allowed: true, reason: null }
}

import slugifyLib from 'slugify'

type SlugifyFn = (input: string, options?: { lower?: boolean; locale?: string; remove?: RegExp }) => string
const slugifyFn = slugifyLib as unknown as SlugifyFn

/**
 * Chuyển đổi string thành slug sử dụng thư viện slugify
 */
export const slugify = (text: string): string => {
  return slugifyFn(text, {
    lower: true, // convert to lower case
    locale: 'vi', // language code of the locale to use
    remove: /[*+~.()'"!:@]/g // remove characters that match regex, defaults to `undefined`
  })
}
