import { OrderStatus, PaymentMethod, PaymentStatus, type Prisma } from '@prisma/client'
import type { OrderWithRelations } from '~/models/orderModel.js'

const toDecimal = (value: number): Prisma.Decimal => value as unknown as Prisma.Decimal

export const buildOrderWithRelations = (
  overrides: Partial<OrderWithRelations> = {}
): OrderWithRelations => {
  const now = new Date('2025-01-01T00:00:00.000Z')

  const baseOrder: OrderWithRelations = {
    id: 1,
    userId: 10,
    orderCode: 'ORD-0001',
    shippingAddressId: 100,
    status: OrderStatus.PENDING,
    subtotal: toDecimal(100000),
    discountAmount: toDecimal(0),
    shippingFee: toDecimal(15000),
    totalPrice: toDecimal(115000),
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 1,
        orderId: 1,
        productId: 101,
        name: 'Demo product',
        image: 'demo.jpg',
        unitPrice: toDecimal(100000),
        discount: toDecimal(0),
        quantity: 1,
        lineTotal: toDecimal(100000)
      }
    ],
    logs: [],
    orderVouchers: [],
    shippingAddress: {
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
      createdAt: now
    },
    payments: [
      {
        id: 11,
        orderId: 1,
        paymentMethod: PaymentMethod.PAYPAL,
        transactionId: null,
        value: toDecimal(115000),
        status: PaymentStatus.PENDING,
        paidAt: null,
        createdAt: now
      }
    ],
    user: {
      id: 10,
      name: 'Test User',
      email: 'test@example.com',
      role: {
        id: 2,
        name: 'user'
      }
    }
  }

  return {
    ...baseOrder,
    ...overrides
  }
}
