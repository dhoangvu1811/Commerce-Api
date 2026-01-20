/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Order Service
 * Xử lý logic business cho order - bao gồm MongoDB transactions
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { orderModel } from '~/models/orderModel.js'
import { productModel } from '~/models/productModel.js'
import { voucherModel } from '~/models/voucherModel.js'
import { userModel } from '~/models/userModel.js'
import { ORDER_STATUS, PAYMENT_STATUS } from '~/utils/constants.js'
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
} from '~/utils/helper.js'
import { ObjectId } from 'mongodb'
import { GET_CLIENT } from '~/config/mongodb.js'
import type {
  Order,
  OrderItem,
  OrderStatus,
  VoucherSnapshot,
  LogEntry,
  PayloadOrderItem,
  CreateOrderPayload,
  AdminOrderQueryFilter,
  OrderMongoFilter,
  UpdateStatusData,
  UpdatePaymentStatusData,
  LogUserInfo,
  LogWithUserInfo,
  OrderLogsResponse
} from '~/types/order.types.js'
import type { Product } from '~/types/product.types.js'
import type { PaginationInfo } from '~/types/common.types.js'

/** Paginated orders result */
interface PaginatedOrdersResult {
  orders: Order[]
  pagination: PaginationInfo
}

/** Status names for error messages */
const STATUS_NAMES: Record<string, string> = {
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

/** Payment status names for error messages */
const PAYMENT_STATUS_NAMES: Record<string, string> = {
  PENDING: 'chưa thanh toán',
  PROCESSING: 'đang xử lý thanh toán',
  PAID: 'đã thanh toán',
  FAILED: 'thanh toán thất bại',
  EXPIRED: 'hết hạn thanh toán',
  CANCELLED: 'đã hủy thanh toán',
  REFUNDED: 'đã hoàn tiền'
}

/**
 * Tạo đơn hàng mới (với MongoDB transaction)
 */
const create = async (
  userId: string,
  payload: CreateOrderPayload
): Promise<Order> => {
  // Start MongoDB session for transaction
  const client = GET_CLIENT()
  if (!client) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Database connection not available'
    )
  }
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

    // 1) Merge duplicate productIds
    const itemsMap = new Map<string, PayloadOrderItem>()
    for (const item of items) {
      if (itemsMap.has(item.productId)) {
        const existing = itemsMap.get(item.productId)!
        existing.quantity += item.quantity
      } else {
        itemsMap.set(item.productId, { ...item })
      }
    }
    const mergedItems = Array.from(itemsMap.values())

    // 2) Validate & lấy thông tin sản phẩm thực tế từ DB
    const productIds = mergedItems.map((i) => new ObjectId(i.productId))
    const products = await productModel.findByIds(productIds)
    if (!products || products.length !== mergedItems.length) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Một số sản phẩm trong giỏ hàng không còn tồn tại. Vui lòng kiểm tra lại giỏ hàng của bạn.'
      )
    }

    // 3) Map giá/discount hiện tại và kiểm tra tồn kho (preliminary check)
    const orderItems: OrderItem[] = mergedItems.map((i) => {
      const prod = products.find(
        (p) => p._id?.toString() === i.productId
      ) as Product
      if (!prod) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm không tồn tại')
      }

      // Preliminary stock check - Fail fast trước khi vào transaction
      if (prod.countInStock < i.quantity) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Rất tiếc, sản phẩm "${prod.name}" chỉ còn ${prod.countInStock} sản phẩm. Vui lòng giảm số lượng hoặc chọn sản phẩm khác.`
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

    // 4) Tính subtotal
    const subtotal = orderItems.reduce((sum, it) => sum + it.lineTotal, 0)

    // 5) Voucher (nếu có)
    let voucherSnapshot: VoucherSnapshot | null = null
    let discountValue = 0
    let voucherId: string | null = null

    if (voucherCode) {
      const voucher = await voucherModel.findOneByCode(
        voucherCode.toUpperCase().trim()
      )
      if (!voucher)
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Mã giảm giá không đúng. Vui lòng kiểm tra lại mã bạn đã nhập.'
        )
      if (!voucher.isActive)
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Mã giảm giá này hiện không còn được sử dụng. Vui lòng thử mã khác.'
        )

      const now = new Date()
      if (voucher.startDate && new Date(voucher.startDate) > now) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Mã giảm giá này chưa đến thời gian sử dụng. Vui lòng quay lại sau.'
        )
      }
      if (voucher.endDate && new Date(voucher.endDate) < now) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Mã giảm giá đã hết hạn sử dụng. Vui lòng thử mã khác.'
        )
      }
      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Mã giảm giá đã được sử dụng hết. Vui lòng thử mã khác.'
        )
      }
      if (
        voucher.minOrderValue &&
        Number(subtotal) < Number(voucher.minOrderValue)
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Đơn hàng cần có giá trị tối thiểu ${voucher.minOrderValue.toLocaleString(
            'vi-VN'
          )}đ để sử dụng mã giảm giá này.`
        )
      }

      const { discount } = applyVoucher(voucher, subtotal)
      discountValue = discount
      voucherId = voucher._id!.toString()
      voucherSnapshot = {
        voucherId: voucher._id!.toString(),
        code: voucher.code,
        type: voucher.type,
        amount: voucher.amount,
        maxDiscount: voucher.maxDiscount || 0,
        discountApplied: discount
      }
    }

    // 6) Validate và tính tổng thanh toán
    const shipping = Number(shippingFee || 0)
    if (shipping < 0 || shipping > 10000000) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phí vận chuyển không hợp lệ. Phải từ 0 đến 10,000,000 VND.'
      )
    }
    const payable = Math.max(
      0,
      Number((subtotal - discountValue + shipping).toFixed(2))
    )

    const orderDoc: Partial<Order> = {
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

    // 7) Execute all operations in a transaction
    let created: Order | null = null

    // Create order input data với userId là string
    const createOrderData = {
      userId, // đây là string từ parameter
      orderCode: orderDoc.orderCode!,
      items: orderDoc.items!,
      shippingAddress: orderDoc.shippingAddress!,
      voucher: orderDoc.voucher,
      totals: orderDoc.totals!,
      status: orderDoc.status,
      paymentStatus: orderDoc.paymentStatus,
      paymentMethod: orderDoc.paymentMethod,
      createdAt: orderDoc.createdAt,
      updatedAt: orderDoc.updatedAt
    }

    await session.withTransaction(async () => {
      // 7.1) Insert order
      created = await orderModel.createNew(createOrderData, { session })

      // 7.2) Reserve stock atomically (inside transaction)
      for (const item of orderItems) {
        const decrementResult = await productModel.decrementStock(
          item.productId,
          item.quantity,
          { session }
        )

        if (!decrementResult.modifiedCount) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Rất tiếc, sản phẩm "${item.name}" vừa hết hàng. Vui lòng thử lại hoặc chọn sản phẩm khác.`
          )
        }
      }

      // 7.3) Reserve voucher usage (inside transaction) - Atomic with limit check
      if (voucherId) {
        const voucherResult = await voucherModel.incrementUsedCountWithLimit(
          voucherId,
          1,
          { session }
        )
        if (!voucherResult.modifiedCount) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            'Mã giảm giá đã được sử dụng hết. Vui lòng thử mã khác.'
          )
        }
      }
    })

    // 7.4) Audit log (outside transaction)
    try {
      await orderModel.appendLog(created!._id!.toString(), {
        action: 'create',
        by: userId,
        byRole: 'user',
        at: new Date(),
        note: 'Người dùng tạo đơn hàng - Tồn kho đã được reserve (transaction)',
        fromStatus: null,
        toStatus: 'PENDING',
        meta: { useTransaction: true }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('appendLog(create) failed:', err)
      }
    }

    return created!
  } catch (error) {
    throw error
  } finally {
    await session.endSession()
  }
}

/**
 * Lấy danh sách đơn hàng của user
 */
const getMyOrders = async (
  userId: string,
  page: number = 1,
  itemsPerPage: number = 10
): Promise<PaginatedOrdersResult> => {
  try {
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Access token không hợp lệ')
    }
    const filter: OrderMongoFilter = { userId: new ObjectId(userId) }
    return await orderModel.getMany(filter, page, itemsPerPage, {
      createdAt: -1
    })
  } catch (error) {
    throw error
  }
}

/**
 * Lấy chi tiết đơn hàng
 */
const getDetails = async (
  orderId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<Order> => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại thông tin.'
      )
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
    return order as Order
  } catch (error) {
    throw error
  }
}

/**
 * Admin: Lấy danh sách đơn hàng
 */
const adminGetOrders = async (
  page: number = 1,
  itemsPerPage: number = 10,
  query: AdminOrderQueryFilter = {}
): Promise<PaginatedOrdersResult> => {
  try {
    const { status, paymentStatus, search } = query
    const filter: OrderMongoFilter = {}
    if (status) filter.status = status
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (search) {
      filter.$or = [
        { 'voucher.code': { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } }
      ]
    }
    return await orderModel.getMany(filter, page, itemsPerPage, {
      createdAt: -1
    })
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật trạng thái đơn hàng
 */
const updateStatus = async (
  orderId: string,
  data: UpdateStatusData,
  adminId: string
): Promise<Order> => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại.'
      )
    }

    if (!adminId || !ObjectId.isValid(adminId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
      )
    }

    const order = await orderModel.findOneById(orderId)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    const { status } = data
    if (!status || !ORDER_STATUS.includes(status)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Trạng thái đơn hàng là bắt buộc và phải hợp lệ'
      )
    }

    // CRITICAL: Không cho phép set CANCELLED/REFUNDED/RETURNED qua route này
    if (status === 'CANCELLED') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể set trạng thái CANCELLED qua route này. Vui lòng sử dụng /admin/cancel để hủy đơn hàng và hoàn lại tồn kho/voucher'
      )
    }
    if (status === 'REFUNDED') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể set trạng thái REFUNDED qua route này. Vui lòng sử dụng /admin/cancel để hủy đơn và hoàn tiền'
      )
    }
    if (status === 'RETURNED') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể set trạng thái RETURNED qua route này. Chức năng hoàn trả hàng cần được xử lý riêng với đầy đủ logic (hoàn kho, xử lý thanh toán)'
      )
    }

    // Validate status transition
    if (status !== order.status) {
      if (!isValidStatusTransition(order.status, status)) {
        const fromStatusName = STATUS_NAMES[order.status] || order.status
        const toStatusName = STATUS_NAMES[status] || status
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Không thể chuyển đơn hàng từ "${fromStatusName}" sang "${toStatusName}"`
        )
      }
    }

    const updateCheck = canUpdateStatus(order, status)
    if (!updateCheck.allowed) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        updateCheck.reason || 'Không thể cập nhật trạng thái đơn hàng'
      )
    }

    // Validate consistency với paymentStatus hiện tại
    if (
      !isConsistentStatusPayment(
        status,
        order.paymentStatus,
        order.paymentMethod
      )
    ) {
      const statusName = STATUS_NAMES[status] || status
      const paymentStatusName =
        PAYMENT_STATUS_NAMES[order.paymentStatus] || order.paymentStatus

      let errorMessage = `Không thể chuyển đơn hàng sang "${statusName}" khi đơn hàng ${paymentStatusName}`
      if (order.paymentMethod) {
        errorMessage += ` (Phương thức: ${order.paymentMethod})`
      }

      throw new ApiError(StatusCodes.BAD_REQUEST, errorMessage)
    }

    // Chuẩn bị data update
    const updateData: Partial<Order> = { status }

    // Tự động set deliveredAt khi status chuyển thành DELIVERED
    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      updateData.deliveredAt = new Date()
    }

    const updated = await orderModel.update(orderId, updateData)

    // Audit log
    try {
      await orderModel.appendLog(orderId, {
        action: 'updateStatus',
        by: adminId,
        byRole: 'admin',
        at: new Date(),
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

    return updated as Order
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật trạng thái thanh toán
 */
const updatePaymentStatus = async (
  orderId: string,
  data: UpdatePaymentStatusData,
  adminId: string
): Promise<Order> => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại.'
      )
    }

    if (!adminId || !ObjectId.isValid(adminId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
      )
    }

    const order = await orderModel.findOneById(orderId)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    const { paymentStatus } = data
    if (!paymentStatus || !PAYMENT_STATUS.includes(paymentStatus)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Trạng thái thanh toán là bắt buộc và phải hợp lệ'
      )
    }

    // CRITICAL: Không cho phép set PAID/REFUNDED qua route này
    if (paymentStatus === 'PAID') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể set trạng thái PAID qua route này. Vui lòng sử dụng /admin/mark-paid để xác nhận thanh toán'
      )
    }
    if (paymentStatus === 'REFUNDED') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể set trạng thái REFUNDED qua route này. Vui lòng sử dụng /admin/cancel để hủy đơn và hoàn tiền'
      )
    }

    // Không cho phép update payment status của các đơn hàng ở trạng thái final
    const finalStatuses: OrderStatus[] = ['CANCELLED', 'COMPLETED', 'REFUNDED']
    if (finalStatuses.includes(order.status)) {
      const statusNames: Record<string, string> = {
        CANCELLED: 'đã hủy',
        COMPLETED: 'đã hoàn thành',
        REFUNDED: 'đã hoàn tiền'
      }
      const statusName = statusNames[order.status] || order.status
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể thay đổi trạng thái thanh toán của đơn hàng ${statusName}`
      )
    }

    // Validate paymentStatus transition
    if (paymentStatus !== order.paymentStatus) {
      if (!isValidPaymentStatusTransition(order.paymentStatus, paymentStatus)) {
        const fromName =
          PAYMENT_STATUS_NAMES[order.paymentStatus] || order.paymentStatus
        const toName = PAYMENT_STATUS_NAMES[paymentStatus] || paymentStatus
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Không thể chuyển trạng thái thanh toán từ "${fromName}" sang "${toName}"`
        )
      }
    }

    // Validate consistency với status hiện tại
    if (
      !isConsistentStatusPayment(
        order.status,
        paymentStatus,
        order.paymentMethod
      )
    ) {
      const statusName = STATUS_NAMES[order.status] || order.status
      const paymentStatusName =
        PAYMENT_STATUS_NAMES[paymentStatus] || paymentStatus

      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể chuyển trạng thái thanh toán sang "${paymentStatusName}" khi đơn hàng đang ở trạng thái "${statusName}"`
      )
    }

    const updated = await orderModel.update(orderId, { paymentStatus })

    // Audit log
    try {
      await orderModel.appendLog(orderId, {
        action: 'updatePaymentStatus',
        by: adminId,
        byRole: 'admin',
        at: new Date(),
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

    return updated as Order
  } catch (error) {
    throw error
  }
}

/**
 * Xác nhận thanh toán thành công (với transaction)
 */
const markPaid = async (orderId: string, adminId: string): Promise<Order> => {
  const client = GET_CLIENT()
  if (!client) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Database connection not available'
    )
  }
  const session = client.startSession()

  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại.'
      )
    }

    if (!adminId || !ObjectId.isValid(adminId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
      )
    }

    const order = await orderModel.findOneById(orderId)
    if (!order)
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')

    const markPaidCheck = canMarkPaid(order, true) // Admin action
    if (!markPaidCheck.allowed) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        markPaidCheck.reason || 'Không thể xác nhận thanh toán'
      )
    }

    if (order.paymentStatus === 'PAID') return order as Order // idempotent

    // Kiểm tra trạng thái thanh toán có thể chuyển thành PAID
    if (
      !['PENDING', 'PROCESSING', 'FAILED', 'EXPIRED'].includes(
        order.paymentStatus
      )
    ) {
      const currentStatusName =
        PAYMENT_STATUS_NAMES[order.paymentStatus] || order.paymentStatus
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Không thể xác nhận thanh toán cho đơn hàng ${currentStatusName}`
      )
    }

    const isCOD = isCODPayment(order.paymentMethod)

    const updateData: Partial<Order> = {
      paymentStatus: 'PAID',
      updatedAt: new Date()
    }

    // Với Online Payment: Mark paid thường ở PENDING/CONFIRMED, auto chuyển CONFIRMED
    if (!isCOD && order.status === 'PENDING') {
      updateData.status = 'CONFIRMED'
    }

    let updated: Order | null = null

    await session.withTransaction(async () => {
      // 1) Tăng selled cho từng item
      for (const it of order.items) {
        await productModel.incrementSelled(it.productId, it.quantity, {
          session
        })
      }

      // 2) Cập nhật order
      updated = await orderModel.update(orderId, updateData, { session })
    })

    // Audit log
    try {
      await orderModel.appendLog(orderId, {
        action: 'markPaid',
        by: adminId,
        byRole: 'admin',
        at: new Date(),
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

    return updated!
  } catch (error) {
    throw error
  } finally {
    await session.endSession()
  }
}

/**
 * Hủy đơn hàng (với transaction)
 */
const cancel = async (
  orderId: string,
  requesterId: string,
  isAdmin: boolean = false
): Promise<Order> => {
  const client = GET_CLIENT()
  if (!client) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Database connection not available'
    )
  }
  const session = client.startSession()

  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại.'
      )
    }

    if (!requesterId || !ObjectId.isValid(requesterId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
      )
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
      const canUserCancel =
        order.status === 'PENDING' || order.status === 'CONFIRMED'

      if (!canUserCancel) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Chỉ có thể hủy đơn khi đơn đang ở trạng thái chờ xử lý (PENDING) hoặc đã xác nhận (CONFIRMED)'
        )
      }
    } else {
      if (order.status === 'DELIVERED' || order.status === 'COMPLETED') {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Không thể hủy đơn hàng đã giao hoặc hoàn thành. Vui lòng sử dụng chức năng hoàn trả.'
        )
      }
    }

    // Đã hủy rồi thì idempotent
    if (order.status === 'CANCELLED') return order as Order

    const needDecrementSelled = order.paymentStatus === 'PAID'

    let updated: Order | null = null

    await session.withTransaction(async () => {
      // 1) Restock tồn kho
      for (const it of order.items) {
        await productModel.incrementStock(it.productId, it.quantity, {
          session
        })
      }

      // 2) Trừ lại selled nếu đã thanh toán
      if (needDecrementSelled) {
        for (const it of order.items) {
          await productModel.decrementSelled(it.productId, it.quantity, {
            session
          })
        }
      }

      // 3) Rollback voucher usedCount
      // Chỉ rollback nếu có voucherId - tránh double rollback
      if (order.voucher?.voucherId) {
        await voucherModel.decrementUsedCount(order.voucher.voucherId, 1, {
          session
        })
      }

      // 4) Cập nhật order
      updated = await orderModel.update(
        orderId,
        {
          status: 'CANCELLED',
          paymentStatus:
            order.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED',
          updatedAt: new Date()
        },
        { session }
      )
    })

    // Audit log
    try {
      await orderModel.appendLog(orderId, {
        action: 'cancel',
        by: requesterId,
        byRole: isAdmin ? 'admin' : 'user',
        at: new Date(),
        note: isAdmin ? 'Admin hủy đơn' : 'Người dùng hủy đơn',
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        meta: {
          previousPaymentStatus: order.paymentStatus,
          useTransaction: true
        }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('appendLog(cancel) failed:', err)
      }
    }

    return updated!
  } catch (error) {
    throw error
  } finally {
    await session.endSession()
  }
}

/**
 * Admin: Lấy logs của đơn hàng
 */
const adminGetOrderLogs = async (
  orderId: string
): Promise<OrderLogsResponse> => {
  try {
    if (!ObjectId.isValid(orderId)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại.'
      )
    }

    const order = await orderModel.getLogsByOrderId(orderId)

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    // Populate thông tin user/admin cho mỗi log entry
    const logsWithUserInfo: LogWithUserInfo[] = await Promise.all(
      (order.logs || []).map(async (log: LogEntry) => {
        let performedBy: LogUserInfo | null = null

        if (log.by && ObjectId.isValid(log.by)) {
          try {
            const user = await userModel.findOneById(log.by)
            if (user) {
              performedBy = {
                _id: user._id!,
                email: user.email,
                displayName: user.name || user.email,
                role: user.role
              }
            }
          } catch (err) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`User not found for log.by: ${log.by}`, err)
            }
          }
        }

        return {
          ...log,
          performedBy
        }
      })
    )

    return {
      orderCode: order.orderCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      logs: logsWithUserInfo
    }
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
  updatePaymentStatus,
  markPaid,
  cancel,
  adminGetOrderLogs
}
