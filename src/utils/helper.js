// Helper: Kiểm tra chuyển đổi trạng thái đơn hàng hợp lệ
export const isValidStatusTransition = (fromStatus, toStatus) => {
  const validTransitions = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['PACKED', 'CANCELLED'],
    PACKED: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'RETURNED'],
    DELIVERED: ['COMPLETED', 'RETURNED'],
    COMPLETED: [], // final state
    CANCELLED: [], // final state
    RETURNED: ['REFUNDED'],
    REFUNDED: [] // final state
  }

  return validTransitions[fromStatus]?.includes(toStatus) || false
}

// Helper: Kiểm tra chuyển đổi trạng thái thanh toán hợp lệ
export const isValidPaymentStatusTransition = (
  fromPaymentStatus,
  toPaymentStatus
) => {
  const validTransitions = {
    PENDING: ['PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
    PROCESSING: ['PAID', 'FAILED', 'CANCELLED'],
    PAID: ['REFUNDED'],
    FAILED: ['PENDING', 'CANCELLED'], // allow retry
    EXPIRED: ['CANCELLED'],
    CANCELLED: [], // final state
    REFUNDED: [] // final state
  }

  return validTransitions[fromPaymentStatus]?.includes(toPaymentStatus) || false
}

// Helper: Kiểm tra có phải COD không
export const isCODPayment = (paymentMethod = '') => {
  const method = paymentMethod.toLowerCase()
  return method === 'cod' || method.includes('cod') || method.includes('cash')
}

// Helper: Kiểm tra có phải Online Payment không
export const isOnlinePayment = (paymentMethod = '') => {
  const method = paymentMethod.toLowerCase()
  return (
    ['card', 'ewallet', 'bank', 'credit', 'debit', 'momo', 'zalopay'].some(
      (keyword) => method.includes(keyword)
    ) ||
    (!isCODPayment(paymentMethod) && paymentMethod.trim() !== '')
  )
}

// Helper: Kiểm tra có thể update status hay không dựa trên payment method
export const canUpdateStatus = (order, newStatus) => {
  if (!order) return { allowed: false, reason: 'Đơn hàng không tồn tại' }

  const { paymentStatus, paymentMethod } = order

  // Các status không cần kiểm tra payment
  const freeStatusUpdates = ['PENDING', 'CONFIRMED', 'CANCELLED']
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
    const requiresPaymentStatuses = [
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
      const statusNames = {
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

// Helper: Kiểm tra tính nhất quán giữa status và paymentStatus
export const isConsistentStatusPayment = (
  status,
  paymentStatus,
  paymentMethod = ''
) => {
  // Các quy tắc nhất quán
  const rules = [
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
        const requiresPaymentStatuses = [
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

// Helper: tính line total theo unitPrice/discount/quantity
export const calcLineTotal = (price, discount, quantity) => {
  const unitPrice = Number(price)
  const disc = Number(discount || 0)
  const qty = Number(quantity)
  const afterDiscount = disc > 0 ? unitPrice * (1 - disc / 100) : unitPrice
  return Math.max(0, Number((afterDiscount * qty).toFixed(2)))
}

// Helper: áp dụng voucher theo service logic hiện có (mã đã active)
export const applyVoucher = (voucher, subtotal) => {
  if (!voucher) return { discount: 0 }
  let discount = 0
  if (voucher.type === 'percent') {
    discount = (Number(subtotal) * Number(voucher.amount)) / 100
    if (voucher.maxDiscount && discount > Number(voucher.maxDiscount)) {
      discount = Number(voucher.maxDiscount)
    }
  } else {
    discount = Number(voucher.amount)
  }
  if (discount > Number(subtotal)) discount = Number(subtotal)
  return { discount }
}

// Tạo mã đơn hàng random
export const generateOrderCode = () => {
  const timestamp = Date.now().toString().slice(-6) // Lấy 6 số cuối của timestamp
  const random = Math.random().toString(36).substring(2, 8).toUpperCase() // 6 ký tự random
  return `ORD${timestamp}${random}`
}

// Helper: Kiểm tra có thể đánh dấu đã thanh toán hay không
export const canMarkPaid = (order, isAdmin = false) => {
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
    const statusNames = {
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
    const paymentStatusNames = {
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
