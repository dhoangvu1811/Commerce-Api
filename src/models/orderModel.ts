/**
 * Order Model - Prisma Version
 * Quản lý dữ liệu đơn hàng với relations: OrderItem, OrderLog, OrderVoucher
 */

import { prisma } from '~/config/prisma.js'
import {
  type Order,
  type OrderItem,
  type OrderLog,
  type OrderVoucher,
  type ShippingAddress,
  type Payment,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  VoucherType,
  Prisma
} from '../generated/prisma/index.js'
import type { DecimalType as Decimal } from '../generated/prisma/index.js'

/** Export types từ Prisma */
export type { Order, OrderItem, OrderLog, OrderVoucher, ShippingAddress }

/** Order với relations */
export type OrderWithRelations = Order & {
  items: OrderItem[]
  logs: OrderLog[]
  orderVouchers: OrderVoucher[]
  shippingAddress?: ShippingAddress
  payments: Payment[]
  user?: {
    id: number
    name: string
    email: string
    role: { id: number; name: string }
  }
}

/** Paginated result cho orders */
export interface PaginatedOrdersResult {
  orders: OrderWithRelations[]
  pagination: {
    page: number
    itemsPerPage: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/** Input cho OrderItem khi tạo order */
export interface CreateOrderItemInput {
  productId: number
  name: string
  image?: string
  unitPrice: number | Decimal
  discount?: number | Decimal
  quantity: number
  lineTotal: number | Decimal
}

/** Input cho OrderVoucher snapshot */
export interface CreateOrderVoucherInput {
  voucherId: number
  code: string
  type: VoucherType
  amount: number | Decimal
  maxDiscount?: number | Decimal | null
  discountValue: number | Decimal
}

/** Input cho OrderLog */
export interface CreateOrderLogInput {
  action: string
  performedById?: number | null
  performedByRole?: string | null
  fromStatus?: OrderStatus | null
  toStatus?: OrderStatus | null
  fromPaymentStatus?: PaymentStatus | null
  toPaymentStatus?: PaymentStatus | null
  note?: string | null
  meta?: Prisma.InputJsonValue
}

/** Input tạo order mới */
export interface CreateOrderInput {
  userId: number
  orderCode: string
  shippingAddressId: number
  status?: OrderStatus
  paymentMethod: PaymentMethod
  subtotal: number | Decimal
  discountAmount?: number | Decimal
  shippingFee?: number | Decimal
  totalPrice: number | Decimal
  items: CreateOrderItemInput[]
  voucher?: CreateOrderVoucherInput | null
}

/** Input cập nhật order */
export interface UpdateOrderInput {
  status?: OrderStatus
  deliveredAt?: Date | null
  subtotal?: number | Decimal
  discountAmount?: number | Decimal
  shippingFee?: number | Decimal
  totalPrice?: number | Decimal
}

/** Filter cho getMany */
export interface OrderFilter {
  userId?: number
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  search?: string
}

/** Order logs result */
export interface OrderLogsResult {
  id: number
  orderCode: string
  status: OrderStatus
  logs: OrderLog[]
}

/**
 * Tạo order mới với tất cả relations (transaction)
 */
const createNew = async (
  data: CreateOrderInput
): Promise<OrderWithRelations> => {
  const order = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1. Tạo Order
      const createdOrder = await tx.order.create({
        data: {
          userId: data.userId,
          orderCode: data.orderCode,
          shippingAddressId: data.shippingAddressId,
          status: data.status || OrderStatus.PENDING,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount ?? 0,
          shippingFee: data.shippingFee ?? 0,
          totalPrice: data.totalPrice
        }
      })

      // 1.1 Tạo Payment record đầu tiên
      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          paymentMethod: data.paymentMethod,
          value: data.totalPrice,
          status: PaymentStatus.PENDING
        }
      })

      // 2. Tạo OrderItems
      await tx.orderItem.createMany({
        data: data.items.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          name: item.name,
          image: item.image || null,
          unitPrice: item.unitPrice,
          discount: item.discount ?? 0,
          quantity: item.quantity,
          lineTotal: item.lineTotal
        }))
      })

      // 3. Tạo OrderVoucher nếu có
      if (data.voucher) {
        await tx.orderVoucher.create({
          data: {
            orderId: createdOrder.id,
            voucherId: data.voucher.voucherId,
            code: data.voucher.code,
            type: data.voucher.type,
            amount: data.voucher.amount,
            maxDiscount: data.voucher.maxDiscount ?? null,
            discountValue: data.voucher.discountValue
          }
        })
      }

      // 4. Tạo initial log
      await tx.orderLog.create({
        data: {
          orderId: createdOrder.id,
          action: 'create',
          performedById: data.userId,
          performedByRole: 'user',
          toStatus: 'PENDING',
          toPaymentStatus: 'PENDING',
          note: 'Người dùng tạo đơn hàng'
        }
      })

      // 5. Return với relations
      return await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          items: true,
          logs: { orderBy: { createdAt: 'desc' } },
          orderVouchers: true,
          shippingAddress: true,
          payments: { orderBy: { createdAt: 'desc' } }
        }
      })
    }
  )

  return order as OrderWithRelations
}

/**
 * Tìm order theo ID với relations
 */
const findOneById = async (
  orderId: number
): Promise<OrderWithRelations | null> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      logs: { orderBy: { createdAt: 'desc' } },
      orderVouchers: true,
      shippingAddress: true,
      payments: { orderBy: { createdAt: 'desc' } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  })
  return order as OrderWithRelations | null
}

/**
 * Tìm order theo orderCode
 */
const findByOrderCode = async (
  orderCode: string
): Promise<OrderWithRelations | null> => {
  const order = await prisma.order.findUnique({
    where: { orderCode },
    include: {
      items: true,
      logs: { orderBy: { createdAt: 'desc' } },
      orderVouchers: true,
      shippingAddress: true,
      payments: { orderBy: { createdAt: 'desc' } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  })
  return order as OrderWithRelations | null
}

/**
 * Lấy danh sách orders với phân trang
 */
const getMany = async (
  filter: OrderFilter = {},
  page: number = 1,
  itemsPerPage: number = 10,
  orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' }
): Promise<PaginatedOrdersResult> => {
  const skip = (page - 1) * itemsPerPage

  // Build where clause
  const where: Prisma.OrderWhereInput = {}

  if (filter.userId !== undefined) {
    where.userId = filter.userId
  }
  if (filter.status) {
    where.status = filter.status
  }
  if (filter.paymentStatus) {
    where.payments = {
      some: { status: filter.paymentStatus }
    }
  }
  if (filter.search) {
    where.OR = [
      { orderCode: { contains: filter.search, mode: 'insensitive' } },
      {
        orderVouchers: {
          some: { code: { contains: filter.search, mode: 'insensitive' } }
        }
      },
      {
        shippingAddress: {
          fullName: { contains: filter.search, mode: 'insensitive' }
        }
      }
    ]
  }

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      skip,
      take: itemsPerPage,
      include: {
        items: true,
        logs: { orderBy: { createdAt: 'desc' }, take: 5 },
        orderVouchers: true,
        shippingAddress: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    }),
    prisma.order.count({ where })
  ])

  const totalPages = Math.ceil(totalOrders / itemsPerPage)

  return {
    orders: orders as OrderWithRelations[],
    pagination: {
      page,
      itemsPerPage,
      totalItems: totalOrders,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Cập nhật thông tin order
 */
const update = async (
  orderId: number,
  updateData: UpdateOrderInput
): Promise<Order | null> => {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    })
    return order
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Order không tồn tại
    }
    // Re-throw other errors (validation, constraint violations, etc.)
    throw error
  }
}

/**
 * Thêm log entry vào order (thay thế embedded logs)
 */
const appendLog = async (
  orderId: number,
  logEntry: CreateOrderLogInput
): Promise<OrderLog> => {
  const log = await prisma.orderLog.create({
    data: {
      orderId,
      action: logEntry.action,
      performedById: logEntry.performedById ?? null,
      performedByRole: logEntry.performedByRole ?? null,
      fromStatus: logEntry.fromStatus ?? null,
      toStatus: logEntry.toStatus ?? null,
      fromPaymentStatus: logEntry.fromPaymentStatus ?? null,
      toPaymentStatus: logEntry.toPaymentStatus ?? null,
      note: logEntry.note ?? null,
      meta: logEntry.meta ?? undefined
    }
  })
  return log
}

/**
 * Xóa order theo ID (cascade sẽ xóa items, logs, vouchers)
 */
const deleteOneById = async (orderId: number): Promise<Order | null> => {
  try {
    const order = await prisma.order.delete({
      where: { id: orderId }
    })
    return order
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Order không tồn tại
    }
    // Re-throw other errors (constraint violations, etc.)
    throw error
  }
}

/**
 * Lấy logs của order theo ID
 */
const getLogsByOrderId = async (
  orderId: number
): Promise<OrderLogsResult | null> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderCode: true,
      status: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      logs: { orderBy: { createdAt: 'desc' } }
    }
  })
  return order as OrderLogsResult | null
}

export const orderModel = {
  createNew,
  findOneById,
  findByOrderCode,
  getMany,
  update,
  appendLog,
  deleteOneById,
  getLogsByOrderId
}
