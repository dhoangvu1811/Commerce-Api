/**
 * Payment Service
 * Điều phối nghiệp vụ thanh toán qua cổng PayPal.
 */

import { StatusCodes } from 'http-status-codes'
import { OrderStatus, PaymentMethod, PaymentStatus, type Prisma } from '@prisma/client'
import ApiError from '~/utils/ApiError.js'
import { orderModel } from '~/models/orderModel.js'
import { productModel } from '~/models/productModel.js'
import { paypalService } from '~/services/paypalService.js'
import { prisma } from '~/config/prisma.js'
import { notificationService } from '~/services/notificationService.js'
import { emitToAdmin, emitToUser, SOCKET_EVENTS } from '~/config/socket.js'
import type { CapturePaypalOrderResult, CreatePaypalOrderResult } from '~/types/payment.types.js'
import {
  convertOrderAmountToPayPalCurrency,
  isAmountTooSmallForCurrency,
  parseUserId,
  resolvePayPalCurrency,
  resolvePayPalSourceCurrency
} from '~/helpers/payments/payment.helper.js'

const PAYPAL_METHOD = PaymentMethod.PAYPAL
const PAYPAL_PAYABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED
]
const PAYPAL_CREATABLE_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
  PaymentStatus.FAILED
]
const PAYPAL_CAPTURE_UPDATABLE_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
  PaymentStatus.FAILED
]

const assertOrderEligibility = async (orderCode: string, userId: number) => {
  const order = await orderModel.findByOrderCode(orderCode)

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy đơn hàng')
  }

  if (order.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền thanh toán đơn hàng này')
  }

  if (order.status === OrderStatus.CANCELLED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Đơn hàng đã bị hủy nên không thể thanh toán')
  }

  if (!PAYPAL_PAYABLE_ORDER_STATUSES.includes(order.status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Đơn hàng không ở trạng thái cho phép thanh toán PayPal. Chỉ hỗ trợ PENDING hoặc CONFIRMED.'
    )
  }

  const latestPayment = order.payments?.[0]

  if (!latestPayment) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không tìm thấy thông tin thanh toán của đơn hàng')
  }

  if (latestPayment.paymentMethod !== PAYPAL_METHOD) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Đơn hàng này không sử dụng phương thức thanh toán PayPal'
    )
  }

  if (
    latestPayment.status === PaymentStatus.CANCELLED ||
    latestPayment.status === PaymentStatus.REFUNDED
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Không thể tiếp tục thanh toán vì giao dịch đã bị hủy hoặc hoàn tiền'
    )
  }

  return { order, latestPayment }
}

const createPaypalOrder = async (
  userId: string,
  orderCode: string
): Promise<CreatePaypalOrderResult> => {
  const userIdNum = parseUserId(userId)
  const trimmedOrderCode = orderCode.trim()

  if (!trimmedOrderCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'orderCode là bắt buộc')
  }

  const { order, latestPayment } = await assertOrderEligibility(trimmedOrderCode, userIdNum)

  if (latestPayment.status === PaymentStatus.PAID) {
    throw new ApiError(StatusCodes.CONFLICT, 'Đơn hàng đã được thanh toán')
  }

  const amount = Number(order.totalPrice)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Đơn hàng có tổng tiền không hợp lệ để thanh toán qua PayPal'
    )
  }

  const currency = resolvePayPalCurrency()
  const sourceCurrency = resolvePayPalSourceCurrency()
  const paypalAmount = convertOrderAmountToPayPalCurrency(
    amount,
    sourceCurrency,
    currency
  )

  if (isAmountTooSmallForCurrency(paypalAmount, currency)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Số tiền quy đổi sang ${currency} không hợp lệ hoặc quá nhỏ để thanh toán PayPal`
    )
  }

  const paypalOrder = await paypalService.createOrder({
    amount: paypalAmount,
    currency,
    orderCode: order.orderCode,
    description: `Thanh toán đơn hàng #${order.orderCode}`
  })

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const paymentUpdateResult = await tx.payment.updateMany({
      where: {
        id: latestPayment.id,
        status: { in: [...PAYPAL_CREATABLE_PAYMENT_STATUSES] },
        order: {
          is: {
            status: { in: [...PAYPAL_PAYABLE_ORDER_STATUSES] }
          }
        }
      },
      data: {
        status: PaymentStatus.PROCESSING,
        transactionId: paypalOrder.id
      }
    })

    if (paymentUpdateResult.count === 0) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Không thể khởi tạo phiên PayPal do trạng thái đơn hàng hoặc thanh toán đã thay đổi'
      )
    }

    await tx.orderLog.create({
      data: {
        orderId: order.id,
        action: 'paypalCreateOrder',
        performedById: userIdNum,
        performedByRole: 'user',
        fromStatus: order.status,
        toStatus: order.status,
        fromPaymentStatus: latestPayment.status,
        toPaymentStatus: PaymentStatus.PROCESSING,
        note: 'Khởi tạo phiên thanh toán PayPal',
        meta: {
          paypalOrderId: paypalOrder.id,
          sourceAmount: amount,
          sourceCurrency,
          paypalAmount,
          paypalCurrency: currency
        }
      }
    })
  })

  return {
    orderCode: order.orderCode,
    paypalOrderId: paypalOrder.id,
    paypalStatus: paypalOrder.status,
    currency,
    amount: paypalAmount,
    paymentStatus: PaymentStatus.PROCESSING
  }
}

const capturePaypalOrder = async (
  userId: string,
  orderCode: string,
  paypalOrderId: string
): Promise<CapturePaypalOrderResult> => {
  const userIdNum = parseUserId(userId)
  const trimmedOrderCode = orderCode.trim()
  const trimmedPaypalOrderId = paypalOrderId.trim()

  if (!trimmedOrderCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'orderCode là bắt buộc')
  }

  if (!trimmedPaypalOrderId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'paypalOrderId là bắt buộc')
  }

  const { order, latestPayment } = await assertOrderEligibility(trimmedOrderCode, userIdNum)

  if (latestPayment.status === PaymentStatus.PAID) {
    return {
      orderCode: order.orderCode,
      paypalOrderId: trimmedPaypalOrderId,
      paypalCaptureId: latestPayment.transactionId || '',
      paymentStatus: PaymentStatus.PAID,
      orderStatus: order.status,
      paidAt: latestPayment.paidAt ? latestPayment.paidAt.toISOString() : new Date().toISOString()
    }
  }

  if (latestPayment.transactionId && latestPayment.transactionId !== trimmedPaypalOrderId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'paypalOrderId không khớp với phiên thanh toán gần nhất của đơn hàng'
    )
  }

  const captureResult = await paypalService.captureOrder(trimmedPaypalOrderId)

  if (captureResult.status !== 'COMPLETED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `PayPal chưa xác nhận thanh toán hoàn tất (status: ${captureResult.status})`
    )
  }

  const targetOrderStatus =
    order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : order.status
  const now = new Date()

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const item of order.items) {
      const incrementResult = await productModel.incrementSelled(item.productId, item.quantity, tx)
      if (!incrementResult.success) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          `Không thể cập nhật số lượng đã bán cho sản phẩm ${item.name}`
        )
      }
    }

    if (targetOrderStatus !== order.status) {
      const orderUpdateResult = await tx.order.updateMany({
        where: {
          id: order.id,
          status: order.status
        },
        data: { status: targetOrderStatus }
      })

      if (orderUpdateResult.count === 0) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          'Trạng thái đơn hàng đã thay đổi trong lúc xác nhận thanh toán PayPal'
        )
      }
    }

    const paymentResult = await tx.payment.updateMany({
      where: {
        id: latestPayment.id,
        transactionId: trimmedPaypalOrderId,
        status: { in: [...PAYPAL_CAPTURE_UPDATABLE_PAYMENT_STATUSES] },
        order: {
          is: {
            status: { in: [...PAYPAL_PAYABLE_ORDER_STATUSES] }
          }
        }
      },
      data: {
        status: PaymentStatus.PAID,
        paidAt: now,
        transactionId: captureResult.captureId
      }
    })

    if (paymentResult.count === 0) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Đơn hàng đã được xác nhận thanh toán bởi một yêu cầu khác'
      )
    }

    await tx.orderLog.create({
      data: {
        orderId: order.id,
        action: 'paypalCapture',
        performedById: userIdNum,
        performedByRole: 'user',
        fromStatus: order.status,
        toStatus: targetOrderStatus,
        fromPaymentStatus: latestPayment.status,
        toPaymentStatus: PaymentStatus.PAID,
        note: 'Người dùng thanh toán thành công qua PayPal',
        meta: {
          paypalOrderId: captureResult.id,
          paypalCaptureId: captureResult.captureId,
          payerId: captureResult.payerId || null
        }
      }
    })
  })

  await notificationService.createNotification(
    order.userId,
    'ORDER_PAYMENT',
    `Đơn hàng #${order.orderCode} đã thanh toán thành công qua PayPal.`
  )

  await notificationService.createAdminNotification(
    'ORDER_PAYMENT',
    `Đơn hàng #${order.orderCode} đã được thanh toán PayPal thành công.`
  )

  emitToUser(order.userId, SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
    orderId: order.id,
    orderCode: order.orderCode,
    fromPaymentStatus: latestPayment.status,
    toPaymentStatus: PaymentStatus.PAID,
    paymentStatusName: 'đã thanh toán'
  })

  emitToAdmin(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
    orderId: order.id,
    orderCode: order.orderCode,
    fromPaymentStatus: latestPayment.status,
    toPaymentStatus: PaymentStatus.PAID,
    updatedBy: userIdNum
  })

  return {
    orderCode: order.orderCode,
    paypalOrderId: captureResult.id,
    paypalCaptureId: captureResult.captureId,
    paymentStatus: PaymentStatus.PAID,
    orderStatus: targetOrderStatus,
    paidAt: now.toISOString()
  }
}

export const paymentService = {
  createPaypalOrder,
  capturePaypalOrder
}
