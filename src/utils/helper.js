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
export const isValidPaymentStatusTransition = (fromPaymentStatus, toPaymentStatus) => {
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

// Helper: Kiểm tra tính nhất quán giữa status và paymentStatus
export const isConsistentStatusPayment = (status, paymentStatus) => {
  // Các quy tắc nhất quán
  const rules = [
    // Nếu đã hoàn thành thì phải đã thanh toán
    () => (status === 'COMPLETED' ? paymentStatus === 'PAID' : true),

    // Nếu đã thanh toán thì status phải >= CONFIRMED
    () => (paymentStatus === 'PAID' ? !['PENDING'].includes(status) : true),

    // Nếu đã refund payment thì status phải là CANCELLED hoặc REFUNDED
    () =>
      paymentStatus === 'REFUNDED'
        ? ['CANCELLED', 'REFUNDED'].includes(status)
        : true,

    // Nếu status là REFUNDED thì payment cũng phải REFUNDED
    () => (status === 'REFUNDED' ? paymentStatus === 'REFUNDED' : true)
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
