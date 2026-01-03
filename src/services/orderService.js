/* eslint-disable no-console */
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { orderModel } from '~/models/orderModel'
import { productModel } from '~/models/productModel'
import { voucherModel } from '~/models/voucherModel'
import { ORDER_STATUS, PAYMENT_STATUS } from '~/utils/constants'
import {
  applyVoucher,
  calcLineTotal,
  canMarkPaid,
  canUpdateStatus,
  generateOrderCode,
  isCODPayment,
  isConsistentStatusPayment,
  isValidPaymentStatusTransition,
  isValidStatusTransition
} from '~/utils/helper'
import { ObjectId } from 'mongodb'
import { GET_CLIENT } from '~/config/mongodb'

const create = async (userId, payload) => {
  // Start MongoDB session for transaction
  const client = GET_CLIENT()
  const session = client.startSession()

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

    // 2) Map giá/discount hiện tại và kiểm tra tồn kho (preliminary check)
    const orderItems = items.map((i) => {
      const prod = products.find((p) => p._id.toString() === i.productId)
      if (!prod) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm không tồn tại')
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
    let voucherId = null

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
      voucherId = voucher._id
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
      orderCode: generateOrderCode(),
      items: orderItems,
      shippingAddress,
      voucher: voucherSnapshot,
      totals: {
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discountValue.toFixed(2)),
        shippingFee: shipping,
        payable
      },
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // 6) Execute all operations in a transaction
    // MongoDB will automatically rollback if any operation fails
    let created = null

    await session.withTransaction(async () => {
      // 6.1) Insert order
      created = await orderModel.createNew(orderDoc, { session })

      // 6.2) Reserve stock atomically (inside transaction)
      for (const item of orderItems) {
        const decrementResult = await productModel.decrementStock(
          item.productId,
          item.quantity,
          { session }
        )

        if (!decrementResult.modifiedCount) {
          // Transaction will auto-rollback
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Sản phẩm "${item.name}" không đủ tồn kho.`
          )
        }
      }

      // 6.3) Reserve voucher usage (inside transaction)
      if (voucherId) {
        await voucherModel.incrementUsedCount(voucherId, 1, { session })
      }
    })

    // 6.4) Audit log (outside transaction)
    try {
      await orderModel.appendLog(created._id, {
        action: 'create',
        by: userId,
        byRole: 'user',
        note: 'Người dùng tạo đơn hàng - Tồn kho đã được reserve (transaction)',
        fromStatus: null,
        toStatus: 'PENDING',
        meta: { useTransaction: true }
      })
    } catch (err) {
      // Log error nhưng không throw để không break main flow
      if (process.env.NODE_ENV === 'development') {
        console.warn('appendLog(create) failed:', err)
      }
    }

    return created
  } catch (error) {
    throw error
  } finally {
    // Always end session
    await session.endSession()
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

const getDetailsByOrderCode = async (orderCode, userId) => {
  try {
    if (!orderCode) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã đơn hàng không hợp lệ')
    }
    const order = await orderModel.findOneByOrderCode(orderCode)
    if (!order)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    if (order.userId.toString() !== userId) {
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
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    // Chỉ xử lý status, không xử lý paymentStatus
    const { status } = data
    if (!status || !ORDER_STATUS.includes(status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Trạng thái đơn hàng là bắt buộc và phải hợp lệ'
      )
    }

    // Validate status transition
    if (status !== order.status) {
      if (!isValidStatusTransition(order.status, status)) {
        // Map status sang ngôn ngữ dễ hiểu
        const statusNames = {
          PENDING: 'Chờ xác nhận',
          CONFIRMED: 'Đã xác nhận',
          PROCESSING: 'Đang xử lý',
          PACKED: 'Đã đóng gói',
          SHIPPED: 'Đang giao hàng',
          DELIVERED: 'Đã giao hàng',
          COMPLETED: 'Hoàn thành',
          CANCELLED: 'Đã hủy',
          RETURNED: 'Đã trả hàng',
          REFUNDED: 'Đã hoàn tiền'
        }
        const fromStatusName = statusNames[order.status] || order.status
        const toStatusName = statusNames[status] || status
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Không thể chuyển đơn hàng từ "${fromStatusName}" sang "${toStatusName}"`
        )
      }
    }

    const updateCheck = canUpdateStatus(order, status)
    if (!updateCheck.allowed) {
      throw new ApiError(StatusCodes.BAD_REQUEST, updateCheck.reason)
    }

    // Validate consistency với paymentStatus hiện tại
    if (
      !isConsistentStatusPayment(
        status,
        order.paymentStatus,
        order.paymentMethod
      )
    ) {
      const statusNames = {
        PENDING: 'Chờ xác nhận',
        CONFIRMED: 'Đã xác nhận',
        PROCESSING: 'Đang xử lý',
        PACKED: 'Đã đóng gói',
        SHIPPED: 'Đang giao hàng',
        DELIVERED: 'Đã giao hàng',
        COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
        RETURNED: 'Đã trả hàng',
        REFUNDED: 'Đã hoàn tiền'
      }
      const paymentStatusNames = {
        PENDING: 'chưa thanh toán',
        PROCESSING: 'đang xử lý thanh toán',
        PAID: 'đã thanh toán',
        FAILED: 'thanh toán thất bại',
        EXPIRED: 'hết hạn thanh toán',
        CANCELLED: 'đã hủy thanh toán',
        REFUNDED: 'đã hoàn tiền'
      }
      const statusName = statusNames[status] || status
      const paymentStatusName =
        paymentStatusNames[order.paymentStatus] || order.paymentStatus

      let errorMessage = `Không thể chuyển đơn hàng sang "${statusName}" khi đơn hàng ${paymentStatusName}`
      if (order.paymentMethod) {
        errorMessage += ` (Phương thức: ${order.paymentMethod})`
      }

      throw new ApiError(StatusCodes.BAD_REQUEST, errorMessage)
    }

    // Chuẩn bị data update
    const updateData = { status }

    // Tự động set deliveredAt khi status chuyển thành DELIVERED
    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      updateData.deliveredAt = new Date()
    }

    const updated = await orderModel.update(orderId, updateData)

    // Audit log: updateStatus (admin)
    try {
      await orderModel.appendLog(orderId, {
        action: 'updateStatus',
        by: 'admin',
        byRole: 'admin',
        note: 'Admin cập nhật trạng thái đơn hàng',
        fromStatus: order.status,
        toStatus: status,
        meta: { paymentStatus: order.paymentStatus }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('appendLog(updateStatus) failed:', err)
      }
    }

    return updated
  } catch (error) {
    throw error
  }
}

const updatePaymentStatus = async (orderId, data) => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
    }

    const order = await orderModel.findOneById(orderId)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    // Chỉ xử lý paymentStatus, không xử lý status
    const { paymentStatus } = data
    if (!paymentStatus || !PAYMENT_STATUS.includes(paymentStatus)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Trạng thái thanh toán là bắt buộc và phải hợp lệ'
      )
    }

    // ⚠️ CRITICAL: Không cho phép set PAID qua route này
    // Phải dùng /admin/mark-paid để đảm bảo stock/voucher được xử lý đúng
    if (paymentStatus === 'PAID') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể set trạng thái PAID qua route này. Vui lòng sử dụng /admin/mark-paid để xác nhận thanh toán'
      )
    }

    // Validate paymentStatus transition
    if (paymentStatus !== order.paymentStatus) {
      if (!isValidPaymentStatusTransition(order.paymentStatus, paymentStatus)) {
        const paymentStatusNames = {
          PENDING: 'chưa thanh toán',
          PROCESSING: 'đang xử lý thanh toán',
          PAID: 'đã thanh toán',
          FAILED: 'thanh toán thất bại',
          EXPIRED: 'hết hạn thanh toán',
          CANCELLED: 'đã hủy thanh toán',
          REFUNDED: 'đã hoàn tiền'
        }
        const fromName =
          paymentStatusNames[order.paymentStatus] || order.paymentStatus
        const toName = paymentStatusNames[paymentStatus] || paymentStatus
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Không thể chuyển trạng thái thanh toán từ "${fromName}" sang "${toName}"`
        )
      }
    }

    // Validate consistency với status hiện tại
    if (!isConsistentStatusPayment(order.status, paymentStatus)) {
      const statusNames = {
        PENDING: 'Chờ xác nhận',
        CONFIRMED: 'Đã xác nhận',
        PROCESSING: 'Đang xử lý',
        PACKED: 'Đã đóng gói',
        SHIPPED: 'Đang giao hàng',
        DELIVERED: 'Đã giao hàng',
        COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
        RETURNED: 'Đã trả hàng',
        REFUNDED: 'Đã hoàn tiền'
      }
      const paymentStatusNames = {
        PENDING: 'chưa thanh toán',
        PROCESSING: 'đang xử lý thanh toán',
        PAID: 'đã thanh toán',
        FAILED: 'thanh toán thất bại',
        EXPIRED: 'hết hạn thanh toán',
        CANCELLED: 'đã hủy thanh toán',
        REFUNDED: 'đã hoàn tiền'
      }
      const statusName = statusNames[order.status] || order.status
      const paymentStatusName =
        paymentStatusNames[paymentStatus] || paymentStatus

      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể chuyển trạng thái thanh toán sang "${paymentStatusName}" khi đơn hàng đang ở trạng thái "${statusName}"`
      )
    }

    const updated = await orderModel.update(orderId, { paymentStatus })

    // Audit log: updatePaymentStatus (admin)
    try {
      await orderModel.appendLog(orderId, {
        action: 'updatePaymentStatus',
        by: 'admin',
        byRole: 'admin',
        note: 'Admin cập nhật trạng thái thanh toán',
        fromPaymentStatus: order.paymentStatus,
        toPaymentStatus: paymentStatus,
        meta: { status: order.status }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('appendLog(updatePaymentStatus) failed:', err)
      }
    }

    return updated
  } catch (error) {
    throw error
  }
}

// Xác nhận thanh toán thành công: tăng selled, cập nhật order (với transaction)
const markPaid = async (orderId) => {
  const client = GET_CLIENT()
  const session = client.startSession()

  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID đơn hàng không hợp lệ')
    }
    const order = await orderModel.findOneById(orderId)
    if (!order)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')

    const markPaidCheck = canMarkPaid(order, true) // Admin action
    if (!markPaidCheck.allowed) {
      throw new ApiError(StatusCodes.BAD_REQUEST, markPaidCheck.reason)
    }

    if (order.paymentStatus === 'PAID') return order // idempotent

    // Kiểm tra trạng thái thanh toán có thể chuyển thành PAID
    if (
      !['PENDING', 'PROCESSING', 'FAILED', 'EXPIRED'].includes(
        order.paymentStatus
      )
    ) {
      const paymentStatusNames = {
        PENDING: 'chưa thanh toán',
        PROCESSING: 'đang xử lý thanh toán',
        PAID: 'đã thanh toán',
        FAILED: 'thanh toán thất bại',
        EXPIRED: 'hết hạn thanh toán',
        CANCELLED: 'đã hủy thanh toán',
        REFUNDED: 'đã hoàn tiền'
      }
      const currentStatusName =
        paymentStatusNames[order.paymentStatus] || order.paymentStatus
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể xác nhận thanh toán cho đơn hàng ${currentStatusName}`
      )
    }

    // Logic khác nhau cho COD vs Online Payment
    const isCOD = isCODPayment(order.paymentMethod)

    const updateData = {
      paymentStatus: 'PAID',
      updatedAt: new Date()
    }

    // Với COD: Có thể mark paid khi DELIVERED, không cần change status
    // Với Online Payment: Mark paid thường ở PENDING/CONFIRMED, auto chuyển CONFIRMED
    if (!isCOD && order.status === 'PENDING') {
      updateData.status = 'CONFIRMED'
    }

    let updated = null

    // Execute all operations in a transaction
    await session.withTransaction(async () => {
      // 1) Tăng selled cho từng item (countInStock đã trừ khi create order)
      for (const it of order.items) {
        await productModel.incrementSelled(it.productId, it.quantity, {
          session
        })
      }

      // 2) Voucher usedCount đã tăng khi create, không cần xử lý lại

      // 3) Cập nhật order
      updated = await orderModel.update(orderId, updateData, { session })
    })

    // Audit log: markPaid (admin) - outside transaction
    try {
      await orderModel.appendLog(orderId, {
        action: 'markPaid',
        by: 'admin',
        byRole: 'admin',
        note: `Xác nhận thanh toán thành công${
          markPaidCheck.reason ? ` (${markPaidCheck.reason})` : ''
        }`,
        fromStatus: order.status,
        toStatus: updateData.status || order.status,
        meta: {
          paymentMethod: order.paymentMethod,
          fromPaymentStatus: order.paymentStatus,
          toPaymentStatus: 'PAID',
          isCOD,
          useTransaction: true
        }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('appendLog(markPaid) failed:', err)
      }
    }
    return updated
  } catch (error) {
    throw error
  } finally {
    await session.endSession()
  }
}

// Hủy đơn hàng
// - User: chỉ hủy khi status = PENDING và paymentStatus = PENDING
// - Admin: có thể hủy bất kỳ; nếu đã PAID thì restock tồn kho (tùy chính sách), đặt paymentStatus='REFUNDED'
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
      // User được hủy khi: PENDING (chưa thanh toán) hoặc CONFIRMED (đã thanh toán nhưng chưa xử lý)
      const canUserCancel =
        (order.status === 'PENDING' && order.paymentStatus === 'PENDING') ||
        (order.status === 'CONFIRMED' && order.paymentStatus === 'PAID')

      if (!canUserCancel) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Chỉ có thể hủy đơn khi đơn đang chờ xử lý hoặc vừa được xác nhận'
        )
      }
    }

    // Đã hủy rồi thì idempotent
    if (order.status === 'CANCELLED') return order

    // Xử lý restock và refund dựa trên trạng thái thanh toán
    // Lưu ý: countInStock đã trừ khi create(), cần hoàn trả
    // selled chỉ tăng khi markPaid(), chỉ trừ nếu đã PAID
    const needRestockInventory = true // Luôn hoàn trả tồn kho vì đã reserve khi create
    const needDecrementSelled = order.paymentStatus === 'PAID' // Chỉ trừ selled nếu đã thanh toán

    if (needRestockInventory) {
      try {
        // Restock tồn kho (vì đã reserve khi create)
        for (const it of order.items) {
          await productModel.incrementStock(it.productId, it.quantity)
        }

        // Trừ lại selled nếu đã thanh toán
        if (needDecrementSelled) {
          for (const it of order.items) {
            await productModel.decrementSelled(it.productId, it.quantity)
          }
        }

        // Rollback voucher usedCount (vì đã tăng khi create)
        if (order.voucher?.code) {
          const voucher = await voucherModel.findOneByCode(order.voucher.code)
          if (voucher?._id) {
            await voucherModel.decrementUsedCount(voucher._id)
          }
        }
      } catch (rollbackError) {
        // Log lỗi rollback nhưng không chặn cancel
        console.error('Rollback error during cancel:', rollbackError)
        // Trong production nên có compensation mechanism hoặc manual review
      }
    }

    const updated = await orderModel.update(orderId, {
      status: 'CANCELLED',
      paymentStatus: needDecrementSelled ? 'REFUNDED' : order.paymentStatus,
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
        toStatus: 'CANCELLED',
        meta: { previousPaymentStatus: order.paymentStatus }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('appendLog(cancel) failed:', err)
      }
    }
    return updated
  } catch (error) {
    throw error
  }
}

// Hủy đơn hàng bằng orderCode cho user
const cancelByOrderCode = async (orderCode, requesterId) => {
  try {
    if (!orderCode) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã đơn hàng không hợp lệ')
    }
    const order = await orderModel.findOneByOrderCode(orderCode)
    if (!order)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')

    // Quyền hủy
    if (!requesterId || order.userId.toString() !== requesterId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không có quyền hủy đơn hàng này'
      )
    }

    // User được hủy khi: PENDING (chưa thanh toán) hoặc CONFIRMED (đã thanh toán nhưng chưa xử lý)
    const canUserCancel =
      (order.status === 'PENDING' && order.paymentStatus === 'PENDING') ||
      (order.status === 'CONFIRMED' && order.paymentStatus === 'PAID')

    if (!canUserCancel) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Chỉ có thể hủy đơn khi đơn đang chờ xử lý hoặc vừa được xác nhận'
      )
    }

    // Đã hủy rồi thì idempotent
    if (order.status === 'CANCELLED') return order

    // Xử lý restock và refund dựa trên trạng thái thanh toán
    // Lưu ý: countInStock đã trừ khi create(), cần hoàn trả
    // selled chỉ tăng khi markPaid(), chỉ trừ nếu đã PAID
    const needRestockInventory = true // Luôn hoàn trả tồn kho vì đã reserve khi create
    const needDecrementSelled = order.paymentStatus === 'PAID' // Chỉ trừ selled nếu đã thanh toán

    if (needRestockInventory) {
      try {
        // Restock tồn kho (vì đã reserve khi create)
        for (const it of order.items) {
          await productModel.incrementStock(it.productId, it.quantity)
        }

        // Trừ lại selled nếu đã thanh toán
        if (needDecrementSelled) {
          for (const it of order.items) {
            await productModel.decrementSelled(it.productId, it.quantity)
          }
        }

        // Rollback voucher usedCount (vì đã tăng khi create)
        if (order.voucher?.code) {
          const voucher = await voucherModel.findOneByCode(order.voucher.code)
          if (voucher?._id) {
            await voucherModel.decrementUsedCount(voucher._id)
          }
        }
      } catch (rollbackError) {
        // Log lỗi rollback nhưng không chặn cancel
        console.error('Rollback error during cancelByOrderCode:', rollbackError)
      }
    }

    const updated = await orderModel.update(order._id, {
      status: 'CANCELLED',
      paymentStatus: needDecrementSelled ? 'REFUNDED' : order.paymentStatus,
      updatedAt: new Date()
    })

    // Audit log: cancel
    try {
      await orderModel.appendLog(order._id, {
        action: 'cancel',
        by: requesterId,
        byRole: 'user',
        note: 'Người dùng hủy đơn bằng mã đơn hàng',
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        meta: { previousPaymentStatus: order.paymentStatus, orderCode }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('appendLog(cancelByOrderCode) failed:', err)
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
  getDetailsByOrderCode,
  adminGetOrders,
  updateStatus,
  updatePaymentStatus,
  markPaid,
  cancel,
  cancelByOrderCode
}
