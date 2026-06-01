/* eslint-disable @typescript-eslint/no-explicit-any */

import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { OrderStatus, PaymentMethod, PaymentStatus, type Prisma } from '@prisma/client'
import { prisma } from '~/config/prisma.js'
import { ghnService } from '~/services/ghnService.js'
import { notificationService } from '~/services/notificationService.js'
import { orderService } from '~/services/orderService.js'
import { orderModel } from '~/models/orderModel.js'
import { productModel } from '~/models/productModel.js'
import { voucherModel } from '~/models/voucherModel.js'
import { buildOrderWithRelations } from './fixtures.js'

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

const patchShippingAddressFindFirst = (): void => {
  patchMethod(prisma.shippingAddress as unknown as Record<string, any>, 'findFirst', async () => ({
    id: 100,
    userId: 10,
    fullName: 'Test User',
    phone: '0900000000',
    addressLine: '123 Test Street',
    fullAddress: '123 Test Street, District 1, HCM',
    provinceId: 79,
    districtId: 760,
    district: 'District 1',
    wardCode: '26734',
    ward: 'Ben Nghe',
    province: 'HCM',
    postalCode: null,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }))
}

const expectApiError = async (promise: Promise<unknown>, statusCode: number): Promise<void> => {
  await expect(promise).rejects.toMatchObject({ statusCode })
}

afterEach(() => {
  vi.restoreAllMocks()

  while (prismaPatchRestorers.length > 0) {
    const restore = prismaPatchRestorers.pop()
    restore?.()
  }
})

describe('orderService.create', () => {
  test('ORD-CRT-HP-001 should create order successfully and merge duplicate items', async () => {
    // Arrange
    const createdOrder = buildOrderWithRelations({
      orderCode: 'ORD-NEW-001',
      items: [
        {
          ...buildOrderWithRelations().items[0]!,
          quantity: 3,
          lineTotal: 300000 as unknown as Prisma.Decimal
        }
      ],
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.COD,
          value: 320000 as unknown as Prisma.Decimal
        }
      ],
      totalPrice: 320000 as unknown as Prisma.Decimal,
      shippingFee: 20000 as unknown as Prisma.Decimal,
      subtotal: 300000 as unknown as Prisma.Decimal
    })

    let reservedStockQty = 0

    patchShippingAddressFindFirst()

    vi.spyOn(productModel, 'findByIds').mockResolvedValue([
      {
        id: 101,
        name: 'Demo product',
        image: 'demo.jpg',
        price: 100000,
        discount: 0,
        stock: 20
      } as any
    ])

    vi.spyOn(ghnService, 'quoteFee').mockResolvedValue({ totalFee: 20000 } as any)

    vi.spyOn(productModel, 'decrementStock').mockImplementation(async (_productId: number, qty: number) => {
      reservedStockQty = qty

      return { success: true, modifiedCount: 1 }
    })

    patchMethod(
      prisma as unknown as Record<string, any>,
      '$transaction',
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const tx = {
          order: {
            create: async () => ({ id: 1 })
          },
          payment: {
            create: async () => ({ id: 1 })
          },
          orderItem: {
            createMany: async () => ({ count: 1 })
          },
          orderVoucher: {
            create: async () => ({ id: 1 })
          },
          orderLog: {
            create: async () => ({ id: 1 })
          },
          webhookOutbox: {
            create: async () => ({ id: '1' })
          }
        }

        return await callback(tx as unknown as Prisma.TransactionClient)
      }
    )

    vi.spyOn(orderModel, 'findOneById').mockResolvedValue(createdOrder)
    vi.spyOn(notificationService, 'createAdminNotification').mockResolvedValue({ id: 1 } as any)

    // Act
    const result = await orderService.create('10', {
      items: [
        { productId: '101', quantity: 1 },
        { productId: '101', quantity: 2 }
      ],
      shippingAddressId: 100,
      shippingServiceId: 53320,
      paymentMethod: PaymentMethod.COD
    })

    // Assert
    expect(result.orderCode).toBe('ORD-NEW-001')
    expect(result.items[0]?.quantity).toBe(3)
    expect(reservedStockQty).toBe(3)
  })

  test('ORD-CRT-ER-001 should reject invalid shippingAddressId', async () => {
    // Arrange
    const payload = {
      items: [{ productId: '101', quantity: 1 }],
      shippingAddressId: 0,
      shippingServiceId: 53320,
      paymentMethod: PaymentMethod.COD
    }

    // Act + Assert
    await expectApiError(orderService.create('10', payload), StatusCodes.BAD_REQUEST)
  })

  test('ORD-CRT-ER-002 should reject when product does not exist', async () => {
    // Arrange
    patchShippingAddressFindFirst()
    vi.spyOn(productModel, 'findByIds').mockResolvedValue([])

    // Act + Assert
    await expectApiError(
      orderService.create('10', {
        items: [{ productId: '101', quantity: 1 }],
        shippingAddressId: 100,
        shippingServiceId: 53320,
        paymentMethod: PaymentMethod.COD
      }),
      StatusCodes.BAD_REQUEST
    )
  })

  test('ORD-CRT-ER-003 should reject expired voucher code', async () => {
    // Arrange
    patchShippingAddressFindFirst()

    vi.spyOn(productModel, 'findByIds').mockResolvedValue([
      {
        id: 101,
        name: 'Demo product',
        image: 'demo.jpg',
        price: 100000,
        discount: 0,
        stock: 20
      } as any
    ])

    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue({
      id: 9,
      code: 'EXPIRED10',
      type: 'PERCENT',
      amount: 10,
      maxDiscount: 100000,
      minOrderValue: null,
      usageLimit: null,
      usedCount: 0,
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-02T00:00:00.000Z'),
      isActive: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any)

    // Act + Assert
    await expectApiError(
      orderService.create('10', {
        items: [{ productId: '101', quantity: 1 }],
        voucherCode: 'EXPIRED10',
        shippingAddressId: 100,
        shippingServiceId: 53320,
        paymentMethod: PaymentMethod.COD
      }),
      StatusCodes.BAD_REQUEST
    )
  })
})

describe('orderService.markPaid', () => {
  test('ORD-MPD-HP-001 should mark paid successfully for non-COD payment', async () => {
    // Arrange
    const initialOrder = buildOrderWithRelations({
      status: OrderStatus.PENDING,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PENDING
        }
      ]
    })

    const refreshedOrder = buildOrderWithRelations({
      status: OrderStatus.CONFIRMED,
      payments: [
        {
          ...initialOrder.payments[0]!,
          status: PaymentStatus.PAID,
          paidAt: new Date('2025-01-01T08:00:00.000Z')
        }
      ]
    })

    let findCall = 0
    let orderUpdateInput: any
    let paymentUpdateInput: any

    vi.spyOn(orderModel, 'findOneById').mockImplementation(async () => {
      findCall += 1

      return findCall === 1 ? initialOrder : refreshedOrder
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
          }
        }

        return await callback(tx as unknown as Prisma.TransactionClient)
      }
    )

    vi.spyOn(orderModel, 'appendLog').mockResolvedValue({ id: 1 } as any)
    vi.spyOn(notificationService, 'createNotification').mockResolvedValue({ id: 1 } as any)

    // Act
    const result = await orderService.markPaid('1', '99')

    // Assert
    expect(result.status).toBe(OrderStatus.CONFIRMED)
    expect(result.paymentStatus).toBe(PaymentStatus.PAID)
    expect(orderUpdateInput.where.status).toBe(OrderStatus.PENDING)
    expect(paymentUpdateInput.data.status).toBe(PaymentStatus.PAID)
  })

  test('ORD-MPD-EG-001 should reject markPaid when payment is already PAID', async () => {
    // Arrange
    const alreadyPaidOrder = buildOrderWithRelations({
      status: OrderStatus.CONFIRMED,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PAID,
          paidAt: new Date('2025-01-01T08:00:00.000Z')
        }
      ]
    })

    vi.spyOn(orderModel, 'findOneById').mockResolvedValue(alreadyPaidOrder)

    // Act + Assert
    await expectApiError(orderService.markPaid('1', '99'), StatusCodes.BAD_REQUEST)
  })

  test('ORD-MPD-ER-001 should raise conflict when payment state changes during markPaid', async () => {
    // Arrange
    const order = buildOrderWithRelations({
      status: OrderStatus.PENDING,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PENDING
        }
      ]
    })

    vi.spyOn(orderModel, 'findOneById').mockResolvedValue(order)
    vi.spyOn(productModel, 'incrementSelled').mockResolvedValue({ success: true, modifiedCount: 1 })

    patchMethod(
      prisma as unknown as Record<string, any>,
      '$transaction',
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const tx = {
          order: {
            updateMany: async () => ({ count: 1 })
          },
          payment: {
            updateMany: async () => ({ count: 0 })
          }
        }

        return await callback(tx as unknown as Prisma.TransactionClient)
      }
    )

    // Act + Assert
    await expectApiError(orderService.markPaid('1', '99'), StatusCodes.CONFLICT)
  })

  test('ORD-MPD-ER-002 should reject markPaid for cancelled order', async () => {
    // Arrange
    const cancelledOrder = buildOrderWithRelations({
      status: OrderStatus.CANCELLED,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          status: PaymentStatus.PENDING
        }
      ]
    })

    vi.spyOn(orderModel, 'findOneById').mockResolvedValue(cancelledOrder)

    // Act + Assert
    await expectApiError(orderService.markPaid('1', '99'), StatusCodes.BAD_REQUEST)
  })
})

describe('orderService.cancel', () => {
  test('ORD-CAN-ER-001 should reject user cancelling another user order', async () => {
    // Arrange
    const order = buildOrderWithRelations({ userId: 20, status: OrderStatus.PENDING })
    vi.spyOn(orderModel, 'findOneById').mockResolvedValue(order)

    // Act + Assert
    await expectApiError(orderService.cancel('1', '10', false), StatusCodes.FORBIDDEN)
  })

  test('ORD-CAN-EG-001 should reject user cancel request for already cancelled order', async () => {
    // Arrange
    const cancelledOrder = buildOrderWithRelations({ status: OrderStatus.CANCELLED })
    vi.spyOn(orderModel, 'findOneById').mockResolvedValue(cancelledOrder)

    // Act + Assert
    await expectApiError(orderService.cancel('1', '10', false), StatusCodes.BAD_REQUEST)
  })

  test('ORD-CAN-HP-001 should cancel paid order and move payment to REFUNDED', async () => {
    // Arrange
    const initialOrder = buildOrderWithRelations({
      status: OrderStatus.CONFIRMED,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          paymentMethod: PaymentMethod.PAYPAL,
          status: PaymentStatus.PAID,
          transactionId: 'PAYPAL-TX-01'
        }
      ]
    })

    const cancelledOrder = buildOrderWithRelations({
      status: OrderStatus.CANCELLED,
      payments: [
        {
          ...initialOrder.payments[0]!,
          status: PaymentStatus.REFUNDED
        }
      ]
    })

    let findCall = 0
    let paymentUpdateInput: any
    let decrementSelledCount = 0

    vi.spyOn(orderModel, 'findOneById').mockImplementation(async () => {
      findCall += 1

      return findCall === 1 ? initialOrder : cancelledOrder
    })

    vi.spyOn(productModel, 'incrementStock').mockResolvedValue({ success: true, modifiedCount: 1 })
    vi.spyOn(productModel, 'decrementSelled').mockImplementation(async () => {
      decrementSelledCount += 1

      return { success: true, modifiedCount: 1 }
    })

    patchMethod(
      prisma as unknown as Record<string, any>,
      '$transaction',
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const tx = {
          payment: {
            findUnique: async () => ({ id: 11, status: PaymentStatus.PAID }),
            update: async (input: unknown) => {
              paymentUpdateInput = input

              return { id: 11 }
            }
          },
          order: {
            updateMany: async () => ({ count: 1 })
          },
          webhookOutbox: {
            create: async () => ({ id: '1' })
          }
        }

        return await callback(tx as unknown as Prisma.TransactionClient)
      }
    )

    vi.spyOn(orderModel, 'appendLog').mockResolvedValue({ id: 1 } as any)
    vi.spyOn(notificationService, 'createAdminNotification').mockResolvedValue({ id: 1 } as any)

    // Act
    const result = await orderService.cancel('1', '10', false)

    // Assert
    expect(decrementSelledCount).toBe(1)
    expect(paymentUpdateInput.data.status).toBe(PaymentStatus.REFUNDED)
    expect(result.status).toBe(OrderStatus.CANCELLED)
    expect(result.paymentStatus).toBe(PaymentStatus.REFUNDED)
  })

  test('ORD-CAN-ER-002 should raise conflict when order status changed during cancel', async () => {
    // Arrange
    const order = buildOrderWithRelations({
      status: OrderStatus.PENDING,
      payments: [
        {
          ...buildOrderWithRelations().payments[0]!,
          status: PaymentStatus.PENDING
        }
      ]
    })

    vi.spyOn(orderModel, 'findOneById').mockResolvedValue(order)
    vi.spyOn(productModel, 'incrementStock').mockResolvedValue({ success: true, modifiedCount: 1 })

    patchMethod(
      prisma as unknown as Record<string, any>,
      '$transaction',
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        const tx = {
          payment: {
            findUnique: async () => ({ id: 11, status: PaymentStatus.PENDING }),
            update: async () => ({ id: 11 })
          },
          order: {
            updateMany: async () => ({ count: 0 })
          },
          webhookOutbox: {
            create: async () => ({ id: '1' })
          }
        }

        return await callback(tx as unknown as Prisma.TransactionClient)
      }
    )

    // Act + Assert
    await expectApiError(orderService.cancel('1', '10', false), StatusCodes.CONFLICT)
  })
})
