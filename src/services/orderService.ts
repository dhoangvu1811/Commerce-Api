/* eslint-disable indent */
/* eslint-disable no-console */

/**
 * Order Service - Prisma Version
 * Xử lý logic business cho order - sử dụng Prisma transactions
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { orderModel, type OrderWithRelations } from '~/models/orderModel.js'
import { productModel } from '~/models/productModel.js'
import { voucherModel } from '~/models/voucherModel.js'
import { userModel } from '~/models/userModel.js'
import { notificationService } from '~/services/notificationService.js'
import { ghnService } from '~/services/ghnService.js'
import { emitToUser, emitToAdmin, SOCKET_EVENTS } from '~/config/socket.js'
import type { VoucherType, Prisma } from '@prisma/client'
import { OrderStatus, PaymentStatus, PaymentMethod, UserStatus } from '@prisma/client'
import { prisma } from '~/config/prisma.js'
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  MAX_SHIPPING_FEE,
  ORDER_STATUS_NAMES as STATUS_NAMES,
  PAYMENT_STATUS_NAMES
} from '~/utils/constants.js'
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
import type {
  Order,
  PayloadOrderItem,
  CreateOrderPayload,
  AdminOrderQueryFilter,
  AdminOrderDashboardSummary,
  UpdateStatusData,
  UpdatePaymentStatusData,
  UpdateOrderInput,
  LogUserInfo,
  LogWithUserInfo,
  OrderLogsResponse
} from '~/types/order.types.js'
import type { Voucher } from '~/types/voucher.types.js'
import type { PaginationInfo } from '~/types/common.types.js'

/** Paginated orders result */
interface PaginatedOrdersResult {
  orders: Order[]
  pagination: PaginationInfo
}

const DASHBOARD_RECENT_ORDER_LIMIT = 6
const DASHBOARD_REVENUE_DAY_COUNT = 7
const DASHBOARD_TOP_PRODUCT_LIMIT = 6

const toDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const buildRecentDateKeys = (days: number): string[] => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateKeys: string[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(startOfToday)

    date.setDate(startOfToday.getDate() - offset)
    dateKeys.push(toDateKey(date))
  }

  return dateKeys
}

const getRevenueRangeStart = (): Date => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfSevenDayWindow = new Date(startOfToday)

  startOfSevenDayWindow.setDate(startOfToday.getDate() - (DASHBOARD_REVENUE_DAY_COUNT - 1))

  return startOfSevenDayWindow < startOfMonth ? startOfSevenDayWindow : startOfMonth
}

const createOrderStatusCounts = (): Record<OrderStatus, number> => {
  return ORDER_STATUS.reduce(
    (acc, status) => {
      acc[status] = 0

      return acc
    },
    {} as Record<OrderStatus, number>
  )
}

/**
 * Map Prisma Order model to API Order type
 */
const mapOrderToApi = (order: OrderWithRelations): Order => {
  return {
    id: order.id,
    _id: order.id,
    userId: order.userId,
    orderCode: order.orderCode,
    status: order.status,
    deliveredAt: order.deliveredAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map(it => ({
      productId: String(it.productId),
      name: it.name,
      image: it.image || '',
      unitPrice: Number(it.unitPrice),
      discount: Number(it.discount),
      quantity: it.quantity,
      lineTotal: Number(it.lineTotal)
    })),
    shippingAddress: {
      id: order.shippingAddress?.id,
      name: order.shippingAddress?.fullName || '',
      phone: order.shippingAddress?.phone || '',
      addressLine: order.shippingAddress?.addressLine || '',
      address: order.shippingAddress?.addressLine || '',
      fullAddress: order.shippingAddress?.fullAddress || '',
      provinceId: order.shippingAddress?.provinceId,
      districtId: order.shippingAddress?.districtId,
      district: order.shippingAddress?.district || '',
      province: order.shippingAddress?.province || '',
      wardCode: order.shippingAddress?.wardCode || undefined,
      ward: order.shippingAddress?.ward || undefined,
      postalCode: order.shippingAddress?.postalCode || undefined,
      isDefault: order.shippingAddress?.isDefault
    },
    user: order.user
      ? {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
          role: order.user.role
        }
      : undefined,
    paymentStatus: order.payments[0]?.status || 'PENDING',
    vouchers: order.orderVouchers.map(ov => ({
      voucherId: ov.voucherId,
      code: ov.code,
      type: ov.type as VoucherType,
      amount: Number(ov.amount),
      maxDiscount: ov.maxDiscount ? Number(ov.maxDiscount) : undefined,
      discountApplied: Number(ov.discountValue)
    })),
    totals: {
      subtotal: Number(order.subtotal),
      discount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      payable: Number(order.totalPrice)
    },
    payments: order.payments.map(p => ({
      id: p.id,
      orderId: p.orderId,
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId,
      value: Number(p.value),
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt
    })),
    logs: order.logs.map(l => ({
      id: l.id,
      action: l.action,
      performedById: l.performedById,
      performedByRole: l.performedByRole as any,
      at: l.createdAt,
      note: l.note,
      fromStatus: l.fromStatus as OrderStatus | null,
      toStatus: l.toStatus as OrderStatus | null,
      fromPaymentStatus: l.fromPaymentStatus as PaymentStatus | null,
      toPaymentStatus: l.toPaymentStatus as PaymentStatus | null,
      meta: l.meta
    }))
  }
}

/**
 * Parse ID string to number
 */
const parseId = (id: string, name: string = 'ID'): number => {
  const num = parseInt(id, 10)
  if (isNaN(num)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `${name} không hợp lệ`)
  }

  return num
}

/**
 * Tạo đơn hàng mới (với Prisma transaction)
 */
const create = async (userId: string, payload: CreateOrderPayload): Promise<Order> => {
  try {
    const userIdNum = parseId(userId, 'User ID')

    const {
      items,
      voucherCode,
      shippingAddressId,
      shippingServiceId,
      paymentMethod = PaymentMethod.COD
    } = payload || {}
    const shippingAddressIdNum = Number(shippingAddressId)

    if (!shippingAddressIdNum || Number.isNaN(shippingAddressIdNum)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Địa chỉ giao hàng không hợp lệ')
    }

    const userShippingAddress = await prisma.shippingAddress.findFirst({
      where: {
        id: shippingAddressIdNum,
        userId: userIdNum,
        isActive: true
      }
    })

    if (!userShippingAddress) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy địa chỉ giao hàng')
    }

    // 1) Merge duplicate productIds
    const itemsMap = new Map<string, PayloadOrderItem>()
    for (const item of items) {
      if (itemsMap.has(String(item.productId))) {
        const existing = itemsMap.get(String(item.productId))!
        existing.quantity += item.quantity
      } else {
        itemsMap.set(String(item.productId), { ...item })
      }
    }
    const mergedItems = Array.from(itemsMap.values())

    // 2) Validate & lấy thông tin sản phẩm từ DB
    const productIds = mergedItems.map(i => parseId(String(i.productId), 'Product ID'))
    const products = await productModel.findByIds(productIds)
    if (!products || products.length !== mergedItems.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Một số sản phẩm trong giỏ hàng không còn tồn tại.')
    }

    // 3) Map giá/discount và kiểm tra tồn kho
    const orderItems = mergedItems.map(i => {
      const productIdNum = parseId(String(i.productId), 'Product ID')
      const prod = products.find(p => p.id === productIdNum)
      if (!prod) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm không tồn tại')
      }

      // Preliminary stock check
      if (prod.stock < i.quantity) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Sản phẩm "${prod.name}" chỉ còn ${prod.stock} sản phẩm.`)
      }

      const unitPrice = Number(prod.price)
      const discount = Number(prod.discount || 0)
      const lineTotal = calcLineTotal(unitPrice, discount, i.quantity)

      return {
        productId: productIdNum,
        name: prod.name,
        image: prod.image || undefined,
        unitPrice,
        discount,
        quantity: i.quantity,
        lineTotal
      }
    })

    // 4) Tính subtotal
    const subtotal = orderItems.reduce((sum, it) => sum + it.lineTotal, 0)

    // 5) Voucher (nếu có)
    let voucherData: {
      voucherId: number
      code: string
      type: VoucherType
      amount: number
      maxDiscount: number | null
      discountValue: number
    } | null = null
    let discountValue = 0

    if (voucherCode) {
      const voucher = await voucherModel.findOneByCode(voucherCode.toUpperCase().trim())
      if (!voucher) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không đúng.')
      }
      if (!voucher.isActive) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá đã bị vô hiệu hóa.')
      }

      const now = new Date()
      if (voucher.startDate && new Date(voucher.startDate) > now) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá chưa đến thời gian sử dụng.')
      }
      if (voucher.endDate && new Date(voucher.endDate) < now) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá đã hết hạn.')
      }
      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá đã được sử dụng hết.')
      }
      if (voucher.minOrderValue && Number(subtotal) < Number(voucher.minOrderValue)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Đơn hàng cần tối thiểu ${Number(voucher.minOrderValue).toLocaleString('vi-VN')}đ.`
        )
      }

      const { discount } = applyVoucher(voucher as unknown as Voucher, subtotal)
      discountValue = discount
      voucherData = {
        voucherId: voucher.id,
        code: voucher.code,
        type: voucher.type as VoucherType,
        amount: Number(voucher.amount),
        maxDiscount: voucher.maxDiscount ? Number(voucher.maxDiscount) : null,
        discountValue: discount
      }
    }

    // 6) Tính phí vận chuyển từ GHN (server-side source of truth)
    const estimatedWeight = Math.max(
      500,
      orderItems.reduce((sum, item) => sum + item.quantity * 200, 0)
    )

    const shippingQuote = await ghnService.quoteFee({
      toDistrictId: userShippingAddress.districtId,
      toWardCode: userShippingAddress.wardCode,
      serviceId: shippingServiceId,
      insuranceValue: Math.max(0, Math.round(subtotal - discountValue)),
      weight: estimatedWeight
    })

    const shipping = Number(shippingQuote.totalFee || 0)
    if (shipping < 0 || shipping > MAX_SHIPPING_FEE) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Phí vận chuyển không hợp lệ.')
    }
    const payable = Math.max(0, Number((subtotal - discountValue + shipping).toFixed(2)))

    // 7) Execute all operations in a Prisma transaction
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 7.1) Reserve stock atomically using model method
      for (const item of orderItems) {
        const decrementResult = await productModel.decrementStock(item.productId, item.quantity, tx)
        if (!decrementResult.success) {
          throw new ApiError(StatusCodes.BAD_REQUEST, `Sản phẩm "${item.name}" vừa hết hàng.`)
        }
      }

      // 7.2) Reserve voucher usage using model method
      if (voucherData) {
        const voucherResult = await voucherModel.incrementUsedCountWithLimit(voucherData.voucherId, 1, tx)
        if (!voucherResult.success) {
          throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá đã hết lượt sử dụng.')
        }
      }

      // 7.3) Create order
      const order = await tx.order.create({
        data: {
          userId: userIdNum,
          orderCode: generateOrderCode(),
          shippingAddressId: shippingAddressIdNum,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount: discountValue,
          shippingFee: shipping,
          totalPrice: payable
        }
      })

      // 7.3.1) Create initial payment
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: (isCODPayment(paymentMethod) ? PaymentMethod.COD : paymentMethod) as PaymentMethod,
          value: payable,
          status: PaymentStatus.PENDING
        }
      })

      // 7.4) Create order items
      await tx.orderItem.createMany({
        data: orderItems.map(item => ({
          orderId: order.id,
          productId: item.productId,
          name: item.name,
          image: item.image || null,
          unitPrice: item.unitPrice,
          discount: item.discount,
          quantity: item.quantity,
          lineTotal: item.lineTotal
        }))
      })

      // 7.5) Create order voucher if exists
      if (voucherData) {
        await tx.orderVoucher.create({
          data: {
            orderId: order.id,
            voucherId: voucherData.voucherId,
            code: voucherData.code,
            type: voucherData.type as VoucherType,
            amount: voucherData.amount,
            maxDiscount: voucherData.maxDiscount,
            discountValue: voucherData.discountValue
          }
        })
      }

      // 7.6) Create initial log
      await tx.orderLog.create({
        data: {
          orderId: order.id,
          action: 'create',
          performedById: userIdNum,
          performedByRole: 'user',
          toStatus: OrderStatus.PENDING,
          toPaymentStatus: PaymentStatus.PENDING,
          note: 'Người dùng tạo đơn hàng'
        }
      })

      return order
    })

    // Return full order with relations
    const fullOrder = await orderModel.findOneById(created.id)
    if (!fullOrder) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Lỗi khi tạo đơn hàng')
    }

    const orderResult = mapOrderToApi(fullOrder)
    const adminOrderMessage =
      `Đơn hàng mới #${orderResult.orderCode} từ ${
        orderResult.user?.name || orderResult.user?.email || 'Khách hàng'
      } - ${orderResult.items.length} sản phẩm`

    // Side-effect realtime là best-effort, không được làm fail luồng tạo đơn đã thành công.
    try {
      await notificationService.createAdminNotification('ORDER_NEW', adminOrderMessage)
    } catch (notificationError) {
      console.error('[OrderService.create] Không thể tạo notification admin cho ORDER_NEW:', notificationError)
    }

    try {
      // Emit realtime: thông báo admin có đơn hàng mới
      emitToAdmin(SOCKET_EVENTS.ORDER_NEW, {
        orderId: orderResult.id,
        orderCode: orderResult.orderCode,
        userId: orderResult.userId,
        userName: orderResult.user?.name || orderResult.user?.email || '',
        totalPrice: orderResult.totals.payable,
        itemCount: orderResult.items.length,
        createdAt: orderResult.createdAt
      })
    } catch (socketError) {
      console.error('[OrderService.create] Không thể emit ORDER_NEW qua socket:', socketError)
    }

    return orderResult
  } catch (error) {
    throw error
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
    const userIdNum = parseId(userId, 'User ID')
    const result = await orderModel.getMany({ userId: userIdNum }, page, itemsPerPage)

    return {
      orders: result.orders.map(mapOrderToApi),
      pagination: result.pagination as any
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy chi tiết đơn hàng
 */
const getDetails = async (orderId: string, userId: string, isAdmin: boolean = false): Promise<Order> => {
  try {
    const orderIdNum = parseId(orderId, 'Order ID')

    const userIdNum = userId ? parseId(userId, 'User ID') : 0

    const order = await orderModel.findOneById(orderIdNum)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    if (!isAdmin && order.userId !== userIdNum) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xem đơn hàng này')
    }

    return mapOrderToApi(order)
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
    const filter: {
      userId?: number
      status?: OrderStatus
      paymentStatus?: PaymentStatus
      search?: string
    } = {}

    if (status) filter.status = status
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (search) filter.search = search

    const result = await orderModel.getMany(filter, page, itemsPerPage)

    return {
      orders: result.orders.map(mapOrderToApi),
      pagination: result.pagination as any
    }
  } catch (error) {
    throw error
  }
}

/**
 * Admin: Lấy dữ liệu tổng hợp dashboard đơn hàng
 */
const adminGetDashboardSummary = async (): Promise<AdminOrderDashboardSummary> => {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const revenueRangeStart = getRevenueRangeStart()
    const revenueDateKeys = buildRecentDateKeys(DASHBOARD_REVENUE_DAY_COUNT)

    const [
      totalOrders,
      groupedStatusCounts,
      recentOrdersResult,
      deliveredOrdersForRevenue,
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersToday,
      newUsersThisMonth,
      totalProducts,
      topSellingProducts
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.groupBy({
        by: ['status'],
        _count: {
          _all: true
        }
      }),
      orderModel.getMany({}, 1, DASHBOARD_RECENT_ORDER_LIMIT),
      prisma.order.findMany({
        where: {
          status: OrderStatus.DELIVERED,
          OR: [
            {
              deliveredAt: {
                gte: revenueRangeStart
              }
            },
            {
              deliveredAt: null,
              createdAt: {
                gte: revenueRangeStart
              }
            }
          ]
        },
        select: {
          deliveredAt: true,
          createdAt: true,
          totalPrice: true
        }
      }),
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.active } }),
      prisma.user.count({ where: { status: UserStatus.inactive } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfToday
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      }),
      prisma.product.count(),
      prisma.product.findMany({
        take: DASHBOARD_TOP_PRODUCT_LIMIT,
        orderBy: [{ selled: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          selled: true
        }
      })
    ])

    const statusCounts = createOrderStatusCounts()

    for (const statusRow of groupedStatusCounts) {
      const status = statusRow.status as OrderStatus

      statusCounts[status] = Number(statusRow._count._all || 0)
    }

    const revenueBucket = revenueDateKeys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = 0

      return acc
    }, {})

    let todayRevenue = 0
    let monthRevenue = 0

    for (const order of deliveredOrdersForRevenue) {
      const revenueDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt)

      if (Number.isNaN(revenueDate.getTime())) {
        continue
      }

      const payable = Number(order.totalPrice || 0)
      const dateKey = toDateKey(revenueDate)

      if (dateKey in revenueBucket) {
        revenueBucket[dateKey] = (revenueBucket[dateKey] || 0) + payable
      }

      if (revenueDate >= startOfMonth) {
        monthRevenue += payable
      }

      if (revenueDate >= startOfToday) {
        todayRevenue += payable
      }
    }

    return {
      users: {
        totalUsers: Number(totalUsers),
        activeUsers: Number(activeUsers),
        inactiveUsers: Number(inactiveUsers),
        newUsersToday: Number(newUsersToday),
        newUsersThisMonth: Number(newUsersThisMonth)
      },
      products: {
        totalProducts: Number(totalProducts),
        topSellingProducts: topSellingProducts.map(product => ({
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          stock: Number(product.stock || 0),
          selled: Number(product.selled || 0)
        }))
      },
      totalOrders: Number(totalOrders),
      recentOrders: recentOrdersResult.orders.map(mapOrderToApi),
      statusCounts,
      revenue: {
        today: todayRevenue,
        month: monthRevenue,
        lastSevenDays: revenueDateKeys.map(key => ({
          key,
          value: revenueBucket[key] || 0
        }))
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật trạng thái đơn hàng
 */
const updateStatus = async (orderId: string, data: UpdateStatusData, adminId: string): Promise<Order> => {
  try {
    const orderIdNum = parseId(orderId, 'Order ID')
    const adminIdNum = parseId(adminId, 'Admin ID')

    const order = await orderModel.findOneById(orderIdNum)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    const { status } = data
    if (!status || !ORDER_STATUS.includes(status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái đơn hàng không hợp lệ')
    }

    // Block final statuses via this route
    if (status === OrderStatus.CANCELLED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Không thể set trạng thái ${status} qua route này`)
    }

    // Validate status transition
    if (status !== order.status) {
      if (!isValidStatusTransition(order.status, status)) {
        const fromName = STATUS_NAMES[order.status] || order.status
        const toName = STATUS_NAMES[status] || status
        throw new ApiError(StatusCodes.BAD_REQUEST, `Không thể chuyển từ "${fromName}" sang "${toName}"`)
      }
    }

    const latestPayment = order.payments?.[0]
    const paymentStatus = latestPayment?.status || PaymentStatus.PENDING
    const paymentMethod = latestPayment?.paymentMethod || ''

    const updateCheck = canUpdateStatus(order as unknown as Order, status)
    if (!updateCheck.allowed) {
      throw new ApiError(StatusCodes.BAD_REQUEST, updateCheck.reason || 'Không thể cập nhật')
    }

    // Validate consistency
    if (!isConsistentStatusPayment(status, paymentStatus, paymentMethod)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái không nhất quán với thanh toán')
    }

    // Update
    const updateData: UpdateOrderInput = { status }
    if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date()
    }

    const updated = await orderModel.update(orderIdNum, updateData)
    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng để cập nhật')
    }

    // Audit log
    await orderModel.appendLog(orderIdNum, {
      action: 'updateStatus',
      performedById: adminIdNum,
      performedByRole: 'admin',
      fromStatus: order.status,
      toStatus: status,
      fromPaymentStatus: paymentStatus,
      toPaymentStatus: paymentStatus,
      note: 'Admin cập nhật trạng thái'
    })

    // Notify User (DB)
    await notificationService.createNotification(
      order.userId,
      'ORDER_STATUS',
      `Đơn hàng #${order.orderCode} của bạn đã chuyển sang trạng thái: ${STATUS_NAMES[status] || status}`
    )

    const refreshed = await orderModel.findOneById(orderIdNum)
    const orderResult = mapOrderToApi(refreshed!)

    // Emit realtime: thông báo user trạng thái đơn hàng thay đổi
    emitToUser(order.userId, SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
      orderId: orderResult.id,
      orderCode: orderResult.orderCode,
      fromStatus: order.status,
      toStatus: status,
      statusName: STATUS_NAMES[status] || status
    })

    // Emit realtime: thông báo admin panel cập nhật (loại trừ admin đang thao tác)
    emitToAdmin(
      SOCKET_EVENTS.ORDER_STATUS_UPDATED,
      {
        orderId: orderResult.id,
        orderCode: orderResult.orderCode,
        fromStatus: order.status,
        toStatus: status,
        updatedBy: adminIdNum
      },
      adminIdNum
    )

    return orderResult
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật trạng thái thanh toán
 */
const updatePaymentStatus = async (orderId: string, data: UpdatePaymentStatusData, adminId: string): Promise<Order> => {
  try {
    const orderIdNum = parseId(orderId, 'Order ID')
    const adminIdNum = parseId(adminId, 'Admin ID')

    const order = await orderModel.findOneById(orderIdNum)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    const { paymentStatus } = data
    if (!paymentStatus || !PAYMENT_STATUS.includes(paymentStatus as any)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Trạng thái thanh toán không hợp lệ')
    }

    const latestPayment = order.payments?.[0]
    if (!latestPayment) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không tìm thấy thông tin thanh toán')
    }

    // Block PAID/REFUNDED via this route
    if (paymentStatus === PaymentStatus.PAID || paymentStatus === PaymentStatus.REFUNDED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Không thể set ${paymentStatus} qua route này`)
    }

    // Block final order statuses
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.DELIVERED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn hàng đã ở trạng thái cuối')
    }

    // Validate transition
    if (paymentStatus !== latestPayment.status) {
      if (!isValidPaymentStatusTransition(latestPayment.status, paymentStatus)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Chuyển trạng thái thanh toán không hợp lệ')
      }
    }

    // Update Payment
    await prisma.payment.update({
      where: { id: latestPayment.id },
      data: { status: paymentStatus }
    })

    // Audit log
    await orderModel.appendLog(orderIdNum, {
      action: 'updatePaymentStatus',
      performedById: adminIdNum,
      performedByRole: 'admin',
      fromStatus: order.status,
      toStatus: order.status,
      fromPaymentStatus: latestPayment.status,
      toPaymentStatus: paymentStatus,
      note: 'Admin cập nhật trạng thái thanh toán'
    })

    // Notify User (DB)
    await notificationService.createNotification(
      order.userId,
      'ORDER_PAYMENT',
      `Trạng thái thanh toán đơn hàng #${order.orderCode} đã cập nhật: ${
        PAYMENT_STATUS_NAMES[paymentStatus] || paymentStatus
      }`
    )

    const refreshed = await orderModel.findOneById(orderIdNum)
    const orderResult = mapOrderToApi(refreshed!)

    // Emit realtime: thông báo user thanh toán thay đổi
    emitToUser(order.userId, SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
      orderId: orderResult.id,
      orderCode: orderResult.orderCode,
      fromPaymentStatus: latestPayment.status,
      toPaymentStatus: paymentStatus,
      paymentStatusName: PAYMENT_STATUS_NAMES[paymentStatus] || paymentStatus
    })

    // Emit realtime: thông báo admin panel cập nhật (loại trừ admin đang thao tác)
    emitToAdmin(
      SOCKET_EVENTS.ORDER_PAYMENT_UPDATED,
      {
        orderId: orderResult.id,
        orderCode: orderResult.orderCode,
        fromPaymentStatus: latestPayment.status,
        toPaymentStatus: paymentStatus,
        updatedBy: adminIdNum
      },
      adminIdNum
    )

    return orderResult
  } catch (error) {
    throw error
  }
}

/**
 * Xác nhận thanh toán thành công (với Prisma transaction)
 */
const markPaid = async (orderId: string, adminId: string): Promise<Order> => {
  try {
    const orderIdNum = parseId(orderId, 'Order ID')
    const adminIdNum = parseId(adminId, 'Admin ID')

    const order = await orderModel.findOneById(orderIdNum)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    const latestPayment = order.payments?.[0]
    if (!latestPayment) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không tìm thấy thông tin thanh toán')
    }

    const markPaidCheck = canMarkPaid(order as unknown as Order, true)
    if (!markPaidCheck.allowed) {
      throw new ApiError(StatusCodes.BAD_REQUEST, markPaidCheck.reason || 'Không thể xác nhận thanh toán')
    }

    if (latestPayment.status === PaymentStatus.PAID) {
      return mapOrderToApi(order) // idempotent
    }

    if (
      latestPayment.status !== PaymentStatus.PENDING &&
      latestPayment.status !== PaymentStatus.PROCESSING &&
      latestPayment.status !== PaymentStatus.FAILED
    ) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể xác nhận thanh toán cho đơn hàng này')
    }

    const isCOD = isCODPayment(latestPayment.paymentMethod)
    const markPaidAllowedStatuses: readonly PaymentStatus[] = [
      PaymentStatus.PENDING,
      PaymentStatus.PROCESSING,
      PaymentStatus.FAILED
    ]

    // Execute in transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Increment selled for each item using model method
      for (const item of order.items) {
        const incrementResult = await productModel.incrementSelled(item.productId, item.quantity, tx)
        if (!incrementResult.success) {
          throw new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Không thể cập nhật số lượng đã bán cho sản phẩm ${item.name}`
          )
        }
      }

      // 2) Update order
      const updateData: { status?: OrderStatus } = {}
      if (!isCOD && order.status === OrderStatus.PENDING) {
        updateData.status = OrderStatus.CONFIRMED
      }

      if (Object.keys(updateData).length > 0) {
        const orderUpdateResult = await tx.order.updateMany({
          where: {
            id: orderIdNum,
            status: OrderStatus.PENDING
          },
          data: updateData
        })

        if (orderUpdateResult.count === 0) {
          throw new ApiError(
            StatusCodes.CONFLICT,
            'Trạng thái đơn hàng đã thay đổi trong lúc xác nhận thanh toán'
          )
        }
      }

      // 3) Update Payment với điều kiện chặt để tránh ghi đè khi đơn đã bị hủy.
      const paymentResult = await tx.payment.updateMany({
        where: {
          id: latestPayment.id,
          status: { in: [...markPaidAllowedStatuses] },
          order: {
            is: {
              status: {
                notIn: [OrderStatus.CANCELLED, OrderStatus.DELIVERED]
              }
            }
          }
        },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date()
        }
      })
      if (paymentResult.count === 0) {
        // Payment có thể đã đổi trạng thái bởi luồng concurrent (cancel/pay).
        throw new ApiError(
          StatusCodes.CONFLICT,
          'Không thể xác nhận thanh toán vì trạng thái đơn hàng hoặc thanh toán đã thay đổi'
        )
      }
    })

    // Audit log
    await orderModel.appendLog(orderIdNum, {
      action: 'markPaid',
      performedById: adminIdNum,
      performedByRole: 'admin',
      fromStatus: order.status,
      toStatus: !isCOD && order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : order.status,
      fromPaymentStatus: latestPayment.status,
      toPaymentStatus: PaymentStatus.PAID,
      note: 'Xác nhận thanh toán thành công'
    })

    // Notify User (DB)
    await notificationService.createNotification(
      order.userId,
      'ORDER_PAYMENT',
      `Đơn hàng #${order.orderCode} của bạn đã được xác nhận thanh toán thành công.`
    )

    const refreshed = await orderModel.findOneById(orderIdNum)
    const orderResult = mapOrderToApi(refreshed!)

    // Emit realtime: thông báo user thanh toán thành công
    emitToUser(order.userId, SOCKET_EVENTS.ORDER_MARK_PAID, {
      orderId: orderResult.id,
      orderCode: orderResult.orderCode,
      totalPrice: orderResult.totals.payable
    })

    // Emit realtime: thông báo admin panel (loại trừ admin đang thao tác)
    emitToAdmin(
      SOCKET_EVENTS.ORDER_MARK_PAID,
      {
        orderId: orderResult.id,
        orderCode: orderResult.orderCode,
        confirmedBy: adminIdNum
      },
      adminIdNum
    )

    return orderResult
  } catch (error) {
    throw error
  }
}

/**
 * Hủy đơn hàng (với Prisma transaction)
 */
const cancel = async (orderId: string, requesterId: string, isAdmin: boolean = false): Promise<Order> => {
  try {
    const orderIdNum = parseId(orderId, 'Order ID')
    const requesterIdNum = parseId(requesterId, 'Requester ID')

    const order = await orderModel.findOneById(orderIdNum)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    // Permission check
    if (!isAdmin) {
      if (order.userId !== requesterIdNum) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền hủy đơn hàng này')
      }
      const canUserCancel = order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED
      if (!canUserCancel) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể hủy đơn khi đang ở PENDING hoặc CONFIRMED')
      }
    } else {
      if (order.status === OrderStatus.DELIVERED) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể hủy đơn hàng đã giao')
      }
    }

    // Already cancelled = idempotent
    if (order.status === OrderStatus.CANCELLED) {
      return mapOrderToApi(order)
    }

    const latestPayment = order.payments?.[0]
    // Biến để capture trạng thái payment thực tế từ trong transaction (tránh stale read trong audit log)
    let actualPaymentStatusBeforeCancel: PaymentStatus | undefined = latestPayment?.status

    // Execute in transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Re-read payment Bên trong transaction để tránh stale read khi markPaid và cancel chạy đồng thời
      const currentPayment = latestPayment ? await tx.payment.findUnique({ where: { id: latestPayment.id } }) : null
      const shouldDecrementSelled = currentPayment?.status === PaymentStatus.PAID
      // Lưu trạng thái để dùng trong audit log sau transaction
      actualPaymentStatusBeforeCancel = currentPayment?.status ?? latestPayment?.status

      // 1) Restock using model method
      for (const item of order.items) {
        const incrementResult = await productModel.incrementStock(item.productId, item.quantity, tx)
        if (!incrementResult.success) {
          throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Không thể hoàn trả tồn kho cho sản phẩm ${item.name}`)
        }
      }

      // 2) Decrement selled if was paid (dùng shouldDecrementSelled từ dữ liệu đọc trong transaction)
      if (shouldDecrementSelled) {
        for (const item of order.items) {
          const decrementResult = await productModel.decrementSelled(item.productId, item.quantity, tx)
          if (!decrementResult.success) {
            throw new ApiError(
              StatusCodes.INTERNAL_SERVER_ERROR,
              `Không thể giảm số lượng đã bán cho sản phẩm ${item.name}`
            )
          }
        }
      }

      // 3) Rollback voucher using model method
      if (order.orderVouchers && order.orderVouchers.length > 0) {
        const voucherId = order.orderVouchers[0]?.voucherId
        if (voucherId) {
          const voucherResult = await voucherModel.decrementUsedCount(voucherId, 1, tx)
          if (!voucherResult) {
            console.warn(`Warning: Could not decrement voucher usage for voucher ID ${voucherId}`)
          }
        }
      }

      // 4) Update order status → CANCELLED bằng CAS theo trạng thái snapshot.
      const cancelResult = await tx.order.updateMany({
        where: {
          id: orderIdNum,
          status: order.status
        },
        data: {
          status: OrderStatus.CANCELLED
        }
      })
      if (cancelResult.count === 0) {
        // Trạng thái đơn có thể đã đổi bởi request concurrent (cancel/pay/updateStatus).
        throw new ApiError(
          StatusCodes.CONFLICT,
          'Không thể hủy vì trạng thái đơn hàng đã thay đổi bởi một yêu cầu khác'
        )
      }

      // 5) Update payment (dùng currentPayment đọc trong transaction → tránh stale read)
      if (currentPayment) {
        await tx.payment.update({
          where: { id: currentPayment.id },
          data: {
            status: currentPayment.status === PaymentStatus.PAID ? PaymentStatus.REFUNDED : PaymentStatus.CANCELLED
          }
        })
      }
    })

    // Audit log (dùng actualPaymentStatusBeforeCancel từ trong transaction, không phải stale read)
    await orderModel.appendLog(orderIdNum, {
      action: 'cancel',
      performedById: requesterIdNum,
      performedByRole: isAdmin ? 'admin' : 'user',
      fromStatus: order.status,
      toStatus: OrderStatus.CANCELLED,
      fromPaymentStatus: actualPaymentStatusBeforeCancel,
      toPaymentStatus:
        actualPaymentStatusBeforeCancel === PaymentStatus.PAID ? PaymentStatus.REFUNDED : PaymentStatus.CANCELLED,
      note: isAdmin ? 'Admin hủy đơn' : 'Người dùng hủy đơn'
    })

    const refreshed = await orderModel.findOneById(orderIdNum)
    const orderResult = mapOrderToApi(refreshed!)

    // Emit realtime: thông báo cả 2 phía về việc hủy đơn
    const cancelPayload = {
      orderId: orderResult.id,
      orderCode: orderResult.orderCode,
      cancelledBy: isAdmin ? 'admin' : 'user',
      cancelledById: requesterIdNum
    }

    // Notify User (DB) — chỉ thông báo khi admin huỷ (để user không nhận notification về hành động của chính mình)
    if (isAdmin) {
      await notificationService.createNotification(
        order.userId,
        'ORDER_CANCELLED',
        `Đơn hàng #${order.orderCode} đã bị admin huỷ.`
      )

      // Thông báo user qua socket
      emitToUser(order.userId, SOCKET_EVENTS.ORDER_CANCELLED, cancelPayload)
    } else {
      // User tự hủy → lưu notification cho admin/staff
      await notificationService.createAdminNotification(
        'ORDER_CANCELLED',
        `Khách hàng đã huỷ đơn hàng #${order.orderCode}.`
      )
    }

    // Thông báo admin (nếu user hủy hoặc để sync admin panel, loại trừ admin đang thao tác)
    emitToAdmin(SOCKET_EVENTS.ORDER_CANCELLED, cancelPayload, requesterIdNum)

    return orderResult
  } catch (error) {
    throw error
  }
}

/**
 * Admin: Lấy logs của đơn hàng
 */
const adminGetOrderLogs = async (orderId: string): Promise<OrderLogsResponse> => {
  try {
    const orderIdNum = parseId(orderId, 'Order ID')

    const order = await orderModel.getLogsByOrderId(orderIdNum)
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
    }

    // Populate user info for each log
    const logsWithUserInfo: LogWithUserInfo[] = await Promise.all(
      (order.logs || []).map(async log => {
        let performedBy: LogUserInfo | null = null

        if (log.performedById) {
          try {
            const user = await userModel.findOneById(log.performedById)
            if (user) {
              const roleName = await prisma.role.findUnique({
                where: { id: user.roleId }
              })
              performedBy = {
                _id: user.id,
                email: user.email,
                displayName: user.name || user.email,
                role: roleName?.name || 'user'
              }
            }
          } catch {
            // Ignore user lookup errors
          }
        }

        return {
          id: log.id,
          action: log.action,
          performedById: log.performedById,
          performedByRole: (log.performedByRole || 'system') as any,
          at: log.createdAt,
          note: log.note || '',
          fromStatus: log.fromStatus as OrderStatus | null,
          toStatus: log.toStatus as OrderStatus | null,
          fromPaymentStatus: log.fromPaymentStatus as PaymentStatus | null,
          toPaymentStatus: log.toPaymentStatus as PaymentStatus | null,
          meta: (log.meta as Record<string, unknown>) || {},
          performedBy
        }
      })
    )

    return {
      orderCode: order.orderCode,
      status: order.status,
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
  adminGetDashboardSummary,
  updateStatus,
  updatePaymentStatus,
  markPaid,
  cancel,
  adminGetOrderLogs
}
