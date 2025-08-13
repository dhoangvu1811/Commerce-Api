import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { orderModel } from '~/models/orderModel'
import { productModel } from '~/models/productModel'
import { voucherModel } from '~/models/voucherModel'
import { ObjectId } from 'mongodb'

// Helper: tính line total theo unitPrice/discount/quantity
const calcLineTotal = (price, discount, quantity) => {
  const unitPrice = Number(price)
  const disc = Number(discount || 0)
  const qty = Number(quantity)
  const afterDiscount = disc > 0 ? unitPrice * (1 - disc / 100) : unitPrice
  return Math.max(0, Number((afterDiscount * qty).toFixed(2)))
}

// Helper: áp dụng voucher theo service logic hiện có (mã đã active)
const applyVoucher = (voucher, subtotal) => {
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

const create = async (userId, payload) => {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Access token không hợp lệ')
    }

    const {
      items,
      voucherCode,
      shippingAddress,
      shippingFee = 0,
      paymentMethod = ''
    } = payload || {}

    // 1) Validate & lấy thông tin sản phẩm thực tế từ DB
    const productIds = items.map((i) => new ObjectId(i.productId))
    const products = await productModel.findByIds(productIds)
    if (!products || products.length !== items.length) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Một hoặc nhiều sản phẩm không tồn tại'
      )
    }

    // 2) Map giá/discount hiện tại và kiểm tra tồn kho
    const orderItems = items.map((i) => {
      const prod = products.find((p) => p._id.toString() === i.productId)
      if (!prod) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm không tồn tại')
      }
      if (prod.countInStock < i.quantity) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Sản phẩm ${prod.name} không đủ tồn kho`
        )
      }
      const unitPrice = Number(prod.price)
      const discount = Number(prod.discount || 0)
      const lineTotal = calcLineTotal(unitPrice, discount, i.quantity)
      return {
        productId: i.productId,
        name: prod.name,
        image: prod.image,
        unitPrice,
        discount,
        quantity: i.quantity,
        lineTotal
      }
    })

    // 3) Tính subtotal
    const subtotal = orderItems.reduce((sum, it) => sum + it.lineTotal, 0)

    // 4) Voucher (nếu có)
    let voucherSnapshot = null
    let discountValue = 0
    if (voucherCode) {
      const voucher = await voucherModel.findOneByCode(
        voucherCode.toUpperCase().trim()
      )
      if (!voucher)
        throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
      if (!voucher.isActive)
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Mã giảm giá đã bị vô hiệu hóa'
        )
      const now = new Date()
      if (voucher.startDate && new Date(voucher.startDate) > now) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Mã giảm giá chưa bắt đầu hiệu lực'
        )
      }
      if (voucher.endDate && new Date(voucher.endDate) < now) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá đã hết hạn')
      }
      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Mã giảm giá đã đạt giới hạn sử dụng'
        )
      }
      if (
        voucher.minOrderValue &&
        Number(subtotal) < Number(voucher.minOrderValue)
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Đơn tối thiểu để áp dụng là ${voucher.minOrderValue}`
        )
      }

      const { discount } = applyVoucher(voucher, subtotal)
      discountValue = discount
      voucherSnapshot = {
        code: voucher.code,
        type: voucher.type,
        amount: voucher.amount,
        maxDiscount: voucher.maxDiscount || 0,
        discountApplied: discount
      }
    }

    // 5) Tổng thanh toán
    const shipping = Number(shippingFee || 0)
    const payable = Math.max(
      0,
      Number((subtotal - discountValue + shipping).toFixed(2))
    )

    const orderDoc = {
      userId,
      items: orderItems,
      shippingAddress,
      voucher: voucherSnapshot,
      totals: {
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discountValue.toFixed(2)),
        shippingFee: shipping,
        payable
      },
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const created = await orderModel.createNew(orderDoc)
    // Audit log: create
    try {
      await orderModel.appendLog(created._id, {
        action: 'create',
        by: userId,
        byRole: 'user',
        note: 'Người dùng tạo đơn hàng',
        fromStatus: null,
        toStatus: 'pending'
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // Không chặn luồng chính nếu ghi log thất bại
        // eslint-disable-next-line no-console
        console.warn('appendLog(create) failed:', err)
      }
    }
    // Lưu ý: Trừ tồn kho / tăng usedCount voucher nên thực hiện khi thanh toán thành công (webhook/payment success)
    return created
  } catch (error) {
    throw error
  }
}

const getMyOrders = async (userId, page = 1, itemsPerPage = 10) => {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Access token không hợp lệ')
    }
    const filter = { userId: new ObjectId(userId) }
    return await orderModel.getMany(
      filter,
      parseInt(page),
      parseInt(itemsPerPage),
      { createdAt: -1 }
    )
  } catch (error) {
    throw error
  }
}

const getDetails = async (orderId, userId, isAdmin = false) => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
    }
    const order = await orderModel.findOneById(orderId)
    if (!order)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    if (!isAdmin && order.userId.toString() !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không có quyền xem đơn hàng này'
      )
    }
    return order
  } catch (error) {
    throw error
  }
}

const adminGetOrders = async (page = 1, itemsPerPage = 10, query = {}) => {
  try {
    const { status, paymentStatus, search } = query
    const filter = {}
    if (status) filter.status = status
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (search) {
      // tìm theo code voucher hoặc tên người nhận
      filter.$or = [
        { 'voucher.code': { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } }
      ]
    }
    return await orderModel.getMany(
      filter,
      parseInt(page),
      parseInt(itemsPerPage),
      { createdAt: -1 }
    )
  } catch (error) {
    throw error
  }
}

const updateStatus = async (orderId, data) => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
    }
    const order = await orderModel.findOneById(orderId)
    if (!order)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')

    const updated = await orderModel.update(orderId, data)
    // Audit log: updateStatus (admin)
    try {
      await orderModel.appendLog(orderId, {
        action: 'updateStatus',
        by: 'admin',
        byRole: 'admin',
        note: 'Admin cập nhật trạng thái đơn',
        fromStatus: order.status,
        toStatus: data.status || order.status,
        meta: { paymentStatus: data.paymentStatus }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('appendLog(updateStatus) failed:', err)
      }
    }
    return updated
  } catch (error) {
    throw error
  }
}

// Xác nhận thanh toán thành công: trừ tồn kho, tăng selled, tăng usedCount voucher, cập nhật order
const markPaid = async (orderId) => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
    }
    const order = await orderModel.findOneById(orderId)
    if (!order)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')

    if (order.paymentStatus === 'paid') return order // idempotent

    // 1) Trừ tồn kho cho từng item (atomic update), nếu thiếu rollback các item đã trừ
    const doneOps = [] // { productId, qty }
    for (const it of order.items) {
      const dec = await productModel.decrementStock(it.productId, it.quantity)
      if (!dec.modifiedCount) {
        // rollback
        for (const op of doneOps) {
          await productModel.incrementStock(op.productId, op.qty)
        }
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Sản phẩm ${it.name} không đủ tồn kho để hoàn tất thanh toán`
        )
      }
      doneOps.push({ productId: it.productId, qty: it.quantity })
      await productModel.incrementSelled(it.productId, it.quantity)
    }

    // 2) Tăng usedCount voucher (nếu có)
    if (order.voucher?.code) {
      const voucher = await voucherModel.findOneByCode(order.voucher.code)
      if (voucher?._id) {
        await voucherModel.incrementUsedCount(voucher._id)
      }
    }

    // 3) Cập nhật order
    const updated = await orderModel.update(orderId, {
      paymentStatus: 'paid',
      status: 'paid',
      updatedAt: new Date()
    })
    // Audit log: markPaid (admin)
    try {
      await orderModel.appendLog(orderId, {
        action: 'markPaid',
        by: 'admin',
        byRole: 'admin',
        note: 'Xác nhận thanh toán thành công',
        fromStatus: order.status,
        toStatus: 'paid'
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('appendLog(markPaid) failed:', err)
      }
    }
    return updated
  } catch (error) {
    throw error
  }
}

// Hủy đơn hàng
// - User: chỉ hủy khi status = pending và paymentStatus = unpaid
// - Admin: có thể hủy bất kỳ; nếu đã paid thì restock tồn kho (tùy chính sách), đặt paymentStatus='refunded'
const cancel = async (orderId, requesterId = null, isAdmin = false) => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
    }
    const order = await orderModel.findOneById(orderId)
    if (!order)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')

    // Quyền hủy
    if (!isAdmin) {
      if (!requesterId || order.userId.toString() !== requesterId) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'Bạn không có quyền hủy đơn hàng này'
        )
      }
      // Chỉ được hủy khi chưa thanh toán và còn pending
      if (!(order.status === 'pending' && order.paymentStatus === 'unpaid')) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Chỉ có thể hủy đơn khi đơn đang chờ và chưa thanh toán'
        )
      }
    }

    // Đã hủy rồi thì idempotent
    if (order.status === 'cancelled') return order

    // Admin có thể hủy đơn đã thanh toán: thực hiện restock cơ bản
    if (isAdmin && order.paymentStatus === 'paid') {
      for (const it of order.items) {
        await productModel.incrementStock(it.productId, it.quantity)
      }
    }

    const updated = await orderModel.update(orderId, {
      status: 'cancelled',
      paymentStatus:
        isAdmin && order.paymentStatus === 'paid'
          ? 'refunded'
          : order.paymentStatus,
      updatedAt: new Date()
    })
    // Audit log: cancel
    try {
      await orderModel.appendLog(orderId, {
        action: 'cancel',
        by: isAdmin ? 'admin' : requesterId,
        byRole: isAdmin ? 'admin' : 'user',
        note: isAdmin ? 'Admin hủy đơn' : 'Người dùng hủy đơn',
        fromStatus: order.status,
        toStatus: 'cancelled',
        meta: { previousPaymentStatus: order.paymentStatus }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('appendLog(cancel) failed:', err)
      }
    }
    return updated
  } catch (error) {
    throw error
  }
}

export const orderService = {
  create,
  getMyOrders,
  getDetails,
  adminGetOrders,
  updateStatus,
  markPaid,
  cancel
}
