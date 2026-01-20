/**
 * Helper Functions
 * Các hàm tiện ích cho business logic
 */

import type { OrderStatus, PaymentStatus, Order } from '~/types/order.types.js'
import type { Voucher } from '~/types/voucher.types.js'

/** Định nghĩa valid transitions cho order status */
type OrderStatusTransitions = Record<OrderStatus, readonly OrderStatus[]>

const validOrderStatusTransitions: OrderStatusTransitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['COMPLETED', 'RETURNED'],
  COMPLETED: ['RETURNED'], // Cho phép trả hàng sau khi hoàn thành
  CANCELLED: [], // final state
  RETURNED: ['REFUNDED'],
  REFUNDED: [] // final state
}

/**
 * Kiểm tra chuyển đổi trạng thái đơn hàng hợp lệ
 * @param {OrderStatus} fromStatus - Trạng thái hiện tại
 * @param {OrderStatus} toStatus - Trạng thái muốn chuyển đến
 * @returns {boolean} Có hợp lệ hay không
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
  PENDING: ['PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
  PROCESSING: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['REFUNDED'], // Chỉ qua /admin/cancel, không được set trực tiếp
  FAILED: ['PENDING', 'CANCELLED'], // allow retry
  EXPIRED: ['CANCELLED'],
  CANCELLED: [], // final state
  REFUNDED: [] // final state
}

/**
 * Kiểm tra chuyển đổi trạng thái thanh toán hợp lệ
 * @param {PaymentStatus} fromPaymentStatus - Trạng thái thanh toán hiện tại
 * @param {PaymentStatus} toPaymentStatus - Trạng thái thanh toán muốn chuyển
 * @returns {boolean} Có hợp lệ hay không
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
 * @param {string} paymentMethod - Phương thức thanh toán
 * @returns {boolean} Có phải COD hay không
 */
export const isCODPayment = (paymentMethod: string = ''): boolean => {
  const method = paymentMethod.toLowerCase()
  return method === 'cod' || method.includes('cod') || method.includes('cash')
}

/**
 * Kiểm tra có phải thanh toán Online không
 * @param {string} paymentMethod - Phương thức thanh toán
 * @returns {boolean} Có phải online payment hay không
 */
export const isOnlinePayment = (paymentMethod: string = ''): boolean => {
  const method = paymentMethod.toLowerCase()
  return (
    ['card', 'ewallet', 'bank', 'credit', 'debit', 'momo', 'zalopay'].some(
      (keyword) => method.includes(keyword)
    ) ||
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
 * @param {Order | null} order - Đơn hàng
 * @param {OrderStatus} newStatus - Trạng thái mới
 * @returns {StatusUpdateResult} Kết quả kiểm tra
 */
export const canUpdateStatus = (
  order: Order | null,
  newStatus: OrderStatus
): StatusUpdateResult => {
  if (!order) return { allowed: false, reason: 'Đơn hàng không tồn tại' }

  const { paymentStatus, paymentMethod } = order

  // Các status không cần kiểm tra payment
  const freeStatusUpdates: readonly OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'CANCELLED'
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

  // Online Payment: Phải markPaid trước mới được update status
  if (isOnlinePayment(paymentMethod)) {
    const requiresPaymentStatuses: readonly OrderStatus[] = [
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED'
    ]

    if (
      requiresPaymentStatuses.includes(newStatus) &&
      paymentStatus !== 'PAID'
    ) {
      const statusNames: Record<string, string> = {
        PROCESSING: 'Đang xử lý',
        PACKED: 'Đã đóng gói',
        SHIPPED: 'Đang giao hàng',
        DELIVERED: 'Đã giao hàng',
        COMPLETED: 'Hoàn thành'
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
 * @param {OrderStatus} status - Trạng thái đơn hàng
 * @param {PaymentStatus} paymentStatus - Trạng thái thanh toán
 * @param {string} paymentMethod - Phương thức thanh toán
 * @returns {boolean} Có nhất quán hay không
 */
export const isConsistentStatusPayment = (
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  paymentMethod: string = ''
): boolean => {
  // Các quy tắc nhất quán
  const rules: Array<() => boolean> = [
    // Rule 1: COMPLETED phải đã PAID
    () => (status === 'COMPLETED' ? paymentStatus === 'PAID' : true),

    // Rule 2: Nếu đã PAID thì status phải >= CONFIRMED
    () => (paymentStatus === 'PAID' ? !['PENDING'].includes(status) : true),

    // Rule 3: REFUNDED logic
    () =>
      paymentStatus === 'REFUNDED'
        ? ['CANCELLED', 'REFUNDED'].includes(status)
        : true,
    () => (status === 'REFUNDED' ? paymentStatus === 'REFUNDED' : true),

    // Rule 4: Online Payment logic - Phải PAID trước khi PROCESSING/PACKED/SHIPPED/DELIVERED
    () => {
      if (isOnlinePayment(paymentMethod)) {
        const requiresPaymentStatuses: readonly OrderStatus[] = [
          'PROCESSING',
          'PACKED',
          'SHIPPED',
          'DELIVERED',
          'COMPLETED'
        ]
        if (
          requiresPaymentStatuses.includes(status) &&
          paymentStatus === 'PENDING'
        ) {
          return false
        }
      }
      return true
    },

    // Rule 5: COD logic - Cho phép DELIVERED + PENDING
    () => {
      if (isCODPayment(paymentMethod)) {
        // COD có thể có status cao mà chưa thanh toán
        return true
      }
      return true
    }
  ]

  return rules.every((rule) => rule())
}

/**
 * Tính tổng tiền theo line item
 * @param {number | string} price - Đơn giá
 * @param {number | string} discount - Phần trăm giảm giá
 * @param {number | string} quantity - Số lượng
 * @returns {number} Tổng tiền
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
 * @param {Voucher | null} voucher - Voucher cần áp dụng
 * @param {number | string} subtotal - Tổng tiền trước giảm
 * @returns {VoucherApplyResult} Kết quả áp dụng
 */
export const applyVoucher = (
  voucher: Voucher | null | undefined,
  subtotal: number | string
): VoucherApplyResult => {
  if (!voucher) return { discount: 0 }

  let discount = 0
  const subtotalNum = Number(subtotal)

  if (voucher.type === 'percent') {
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
 * @returns {string} Mã đơn hàng (format: ORD + 6 số + 6 ký tự random)
 */
export const generateOrderCode = (): string => {
  const timestamp = Date.now().toString().slice(-6) // Lấy 6 số cuối của timestamp
  const random = Math.random().toString(36).substring(2, 8).toUpperCase() // 6 ký tự random
  return `ORD${timestamp}${random}`
}

/**
 * Kiểm tra có thể đánh dấu đã thanh toán hay không
 * @param {Order | null} order - Đơn hàng
 * @param {boolean} isAdmin - Có phải admin không
 * @returns {StatusUpdateResult} Kết quả kiểm tra
 */
export const canMarkPaid = (
  order: Order | null,
  isAdmin: boolean = false
): StatusUpdateResult => {
  if (!order) return { allowed: false, reason: 'Đơn hàng không tồn tại' }

  const { status, paymentStatus, paymentMethod = '' } = order

  // Chỉ admin mới có thể mark paid
  if (!isAdmin) {
    return {
      allowed: false,
      reason: 'Chỉ quản trị viên mới có thể xác nhận thanh toán'
    }
  }

  // Không thể mark paid nếu đã cancelled/refunded
  if (['CANCELLED', 'REFUNDED'].includes(status)) {
    const statusNames: Record<string, string> = {
      CANCELLED: 'đã hủy',
      REFUNDED: 'đã hoàn tiền'
    }
    const statusName = statusNames[status] || status
    return {
      allowed: false,
      reason: `Không thể xác nhận thanh toán cho đơn hàng ${statusName}`
    }
  }

  // Không thể mark paid nếu payment đã refunded/cancelled
  if (['REFUNDED', 'CANCELLED'].includes(paymentStatus)) {
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
  if (paymentStatus === 'PAID') {
    return {
      allowed: false,
      reason: 'Đơn hàng đã được thanh toán rồi'
    }
  }

  // Logic đặc biệt cho COD: Có thể mark paid ngay cả khi DELIVERED
  if (isCODPayment(paymentMethod) && status === 'DELIVERED') {
    return {
      allowed: true,
      reason: null,
      note: 'COD - Thanh toán khi nhận hàng'
    }
  }

  // Logic đặc biệt cho COD: Có thể mark paid khi COMPLETED (trường hợp đã giao nhưng admin chưa kịp mark paid)
  if (
    isCODPayment(paymentMethod) &&
    status === 'COMPLETED' &&
    paymentStatus === 'PENDING'
  ) {
    return {
      allowed: true,
      reason: null,
      note: 'COD - Bổ sung xác nhận thanh toán'
    }
  }

  // Với Online Payment: Không được mark paid nếu đã DELIVERED/COMPLETED (phải thanh toán trước)
  if (
    isOnlinePayment(paymentMethod) &&
    ['DELIVERED', 'COMPLETED'].includes(status)
  ) {
    return {
      allowed: false,
      reason:
        'Đơn hàng thanh toán online phải được thanh toán trước khi giao hàng'
    }
  }

  return { allowed: true, reason: null }
}
