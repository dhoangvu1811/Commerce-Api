/* eslint-disable @typescript-eslint/no-explicit-any */

import { StatusCodes } from 'http-status-codes'
import { afterEach, describe, test, expect, vi } from 'vitest'
import { OrderStatus, PaymentMethod, PaymentStatus, type Prisma } from '@prisma/client'
import { env } from '~/config/environment.js'
import { prisma } from '~/config/prisma.js'
import { paymentService } from '~/services/paymentService.js'
import { notificationService } from '~/services/notificationService.js'
import { paypalService } from '~/services/paypalService.js'
import { orderModel } from '~/models/orderModel.js'
import { productModel } from '~/models/productModel.js'
import { buildOrderWithRelations } from './fixtures.js'

const originalPaypalCurrency = env.PAYPAL_CURRENCY
const originalPaypalSourceCurrency = env.PAYPAL_SOURCE_CURRENCY
const prismaPatchRestorers: Array<() => void> = []

const patchMethod = (
  target: Record<string, any>,
  methodName: string,
  impl: (...args: any[]) => any
): void => {
  const original = target[methodName]
  target[methodName] = impl

  prismaPatchRestorers.push(() => {
    target[methodName] = original
  })
}

const expectApiError = async (promise: Promise<unknown>, statusCode: number): Promise<void> => {
  await expect(promise).rejects.toMatchObject({ statusCode })
}

afterEach(() => {
  vi.restoreAllMocks()
  env.PAYPAL_CURRENCY = originalPaypalCurrency
  env.PAYPAL_SOURCE_CURRENCY = originalPaypalSourceCurrency

  while (prismaPatchRestorers.length > 0) {
    const restore = prismaPatchRestorers.pop()
    restore?.()
  }
})

describe('paymentService.createPaypalOrder', () => {
  test('PAY-CRT-HP-001 should create PayPal order successfully', async () => {
    // Arrange
    env.PAYPAL_SOURCE_CURRENCY = 'USD'
    env.PAYPAL_CURRENCY = 'USD'

    const order = buildOrderWithRelations({
      status: OrderStatus.PENDING,
      totalPrice: 120 as unknown as Prisma.Decimal,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PENDING
        }
      ]
    })

    let paymentUpdateInput: any

    vi.spyOn(orderModel, 'findByOrderCode').mockResolvedValue(order)
    vi.spyOn(paypalService, 'createOrder').mockResolvedValue({
      id: 'PAYPAL-ORDER-01',
      status: 'CREATED'
    } as any)

    patchMethod(
      prisma as unknown as Record<string, any>,
      '$transaction',
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const tx = {
          payment: {
            updateMany: async (input: unknown) => {
              paymentUpdateInput = input

              return { count: 1 }
            }
          },
          orderLog: {
            create: async () => ({ id: 1 })
          }
        }

        return await callback(tx as unknown as Prisma.TransactionClient)
      }
    )

    // Act
    const result = await paymentService.createPaypalOrder('10', 'ORD-0001')

    // Assert
    expect(result.orderCode).toBe('ORD-0001')
    expect(result.paypalOrderId).toBe('PAYPAL-ORDER-01')
    expect(result.paymentStatus).toBe(PaymentStatus.PROCESSING)
    expect(paymentUpdateInput.data.status).toBe(PaymentStatus.PROCESSING)
    expect(paymentUpdateInput.data.transactionId).toBe('PAYPAL-ORDER-01')
  })

  test('PAY-CRT-ER-001 should reject empty orderCode', async () => {
    // Arrange
    const orderCode = '   '

    // Act + Assert
    await expectApiError(paymentService.createPaypalOrder('10', orderCode), StatusCodes.BAD_REQUEST)
  })

  test('PAY-CRT-ER-002 should reject when order payment is already PAID', async () => {
    // Arrange
    const paidOrder = buildOrderWithRelations({
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PAID,
          paidAt: new Date('2025-01-01T08:00:00.000Z')
        }
      ]
    })

    vi.spyOn(orderModel, 'findByOrderCode').mockResolvedValue(paidOrder)

    // Act + Assert
    await expectApiError(paymentService.createPaypalOrder('10', 'ORD-0001'), StatusCodes.CONFLICT)
  })

  test('PAY-CRT-ER-003 should raise conflict when payment status changed during transaction', async () => {
    // Arrange
    env.PAYPAL_SOURCE_CURRENCY = 'USD'
    env.PAYPAL_CURRENCY = 'USD'

    const order = buildOrderWithRelations({
      status: OrderStatus.PENDING,
      totalPrice: 120 as unknown as Prisma.Decimal,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PENDING
        }
      ]
    })

    vi.spyOn(orderModel, 'findByOrderCode').mockResolvedValue(order)
    vi.spyOn(paypalService, 'createOrder').mockResolvedValue({
      id: 'PAYPAL-ORDER-01',
      status: 'CREATED'
    } as any)

    patchMethod(
      prisma as unknown as Record<string, any>,
      '$transaction',
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const tx = {
          payment: {
            updateMany: async () => ({ count: 0 })
          },
          orderLog: {
            create: async () => ({ id: 1 })
          }
        }

        return await callback(tx as unknown as Prisma.TransactionClient)
      }
    )

    // Act + Assert
    await expectApiError(paymentService.createPaypalOrder('10', 'ORD-0001'), StatusCodes.CONFLICT)
  })
})

describe('paymentService.capturePaypalOrder', () => {
  test('PAY-CAP-HP-001 should capture PayPal order and mark payment as PAID', async () => {
    // Arrange
    const order = buildOrderWithRelations({
      status: OrderStatus.PENDING,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PROCESSING,
          transactionId: 'PAYPAL-ORDER-01'
        }
      ]
    })

    let orderUpdateInput: any
    let paymentUpdateInput: any

    vi.spyOn(orderModel, 'findByOrderCode').mockResolvedValue(order)
    vi.spyOn(paypalService, 'captureOrder').mockResolvedValue({
      id: 'PAYPAL-ORDER-01',
      status: 'COMPLETED',
      captureId: 'PAYPAL-CAPTURE-01',
      payerId: 'PAYER-01'
    })

    vi.spyOn(productModel, 'incrementSelled').mockResolvedValue({ success: true, modifiedCount: 1 })

    patchMethod(
      prisma as unknown as Record<string, any>,
      '$transaction',
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const tx = {
          order: {
            updateMany: async (input: unknown) => {
              orderUpdateInput = input

              return { count: 1 }
            }
          },
          payment: {
            updateMany: async (input: unknown) => {
              paymentUpdateInput = input

              return { count: 1 }
            }
          },
          orderLog: {
            create: async () => ({ id: 1 })
          }
        }

        return await callback(tx as unknown as Prisma.TransactionClient)
      }
    )

    vi.spyOn(notificationService, 'createNotification').mockResolvedValue({ id: 1 } as any)
    vi.spyOn(notificationService, 'createAdminNotification').mockResolvedValue({ id: 1 } as any)

    // Act
    const result = await paymentService.capturePaypalOrder('10', 'ORD-0001', 'PAYPAL-ORDER-01')

    // Assert
    expect(result.paymentStatus).toBe(PaymentStatus.PAID)
    expect(result.orderStatus).toBe(OrderStatus.CONFIRMED)
    expect(orderUpdateInput.data.status).toBe(OrderStatus.CONFIRMED)
    expect(paymentUpdateInput.data.status).toBe(PaymentStatus.PAID)
    expect(paymentUpdateInput.data.transactionId).toBe('PAYPAL-CAPTURE-01')
  })

  test('PAY-CAP-ER-001 should reject empty paypalOrderId', async () => {
    // Arrange
    const paypalOrderId = ' '

    // Act + Assert
    await expectApiError(
      paymentService.capturePaypalOrder('10', 'ORD-0001', paypalOrderId),
      StatusCodes.BAD_REQUEST
    )
  })

  test('PAY-CAP-ER-002 should reject paypalOrderId mismatch with latest payment', async () => {
    // Arrange
    const order = buildOrderWithRelations({
      status: OrderStatus.PENDING,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PROCESSING,
          transactionId: 'PAYPAL-ORDER-LOCKED'
        }
      ]
    })

    vi.spyOn(orderModel, 'findByOrderCode').mockResolvedValue(order)

    // Act + Assert
    await expectApiError(
      paymentService.capturePaypalOrder('10', 'ORD-0001', 'PAYPAL-ORDER-NEW'),
      StatusCodes.BAD_REQUEST
    )
  })

  test('PAY-CAP-ER-003 should reject when PayPal capture status is not COMPLETED', async () => {
    // Arrange
    const order = buildOrderWithRelations({
      status: OrderStatus.PENDING,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PROCESSING,
          transactionId: 'PAYPAL-ORDER-01'
        }
      ]
    })

    vi.spyOn(orderModel, 'findByOrderCode').mockResolvedValue(order)
    vi.spyOn(paypalService, 'captureOrder').mockResolvedValue({
      id: 'PAYPAL-ORDER-01',
      status: 'PAYER_ACTION_REQUIRED',
      captureId: 'PAYPAL-CAPTURE-01',
      payerId: 'PAYER-01'
    })

    // Act + Assert
    await expectApiError(
      paymentService.capturePaypalOrder('10', 'ORD-0001', 'PAYPAL-ORDER-01'),
      StatusCodes.BAD_REQUEST
    )
  })

  test('PAY-CAP-EG-001 should return idempotent response when payment already PAID', async () => {
    // Arrange
    const paidOrder = buildOrderWithRelations({
      status: OrderStatus.CONFIRMED,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PAID,
          transactionId: 'PAYPAL-CAPTURE-EXISTING',
          paidAt: new Date('2025-01-01T09:30:00.000Z')
        }
      ]
    })

    vi.spyOn(orderModel, 'findByOrderCode').mockResolvedValue(paidOrder)
    vi.spyOn(paypalService, 'captureOrder').mockRejectedValue(
      new Error('captureOrder should not be called for paid order')
    )

    // Act
    const result = await paymentService.capturePaypalOrder('10', 'ORD-0001', 'PAYPAL-ORDER-01')

    // Assert
    expect(result.paymentStatus).toBe(PaymentStatus.PAID)
    expect(result.paypalCaptureId).toBe('PAYPAL-CAPTURE-EXISTING')
  })
})
