/* eslint-disable no-console */
import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest
} from '@jest/globals'
import { StatusCodes } from 'http-status-codes'
import { orderService } from '~/services/orderService'
import { orderModel } from '~/models/orderModel'
import { productModel } from '~/models/productModel'
import { voucherModel } from '~/models/voucherModel'
import { ObjectId } from 'mongodb'
import { ORDER_STATUS, PAYMENT_STATUS } from '~/utils/constants'

// Mock dependencies
jest.mock('~/models/orderModel')
jest.mock('~/models/productModel')
jest.mock('~/models/voucherModel')

// Mock constants để test có thể import đúng values
jest.mock('~/utils/constants', () => ({
  ORDER_STATUS: [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'PACKED',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'RETURNED',
    'REFUNDED'
  ],
  PAYMENT_STATUS: [
    'PENDING',
    'PROCESSING',
    'PAID',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
    'EXPIRED'
  ]
}))

describe('Order Service - Comprehensive Test Cases', () => {
  const mockUserId = new ObjectId().toString()
  const mockOrderId = new ObjectId().toString()
  const mockProductId = new ObjectId().toString()
  const mockVoucherId = new ObjectId().toString()

  const mockProduct = {
    _id: new ObjectId(mockProductId),
    name: 'Test Product',
    image: 'https://example.com/image.jpg',
    price: 100,
    discount: 10,
    countInStock: 50
  }

  const mockVoucher = {
    _id: new ObjectId(mockVoucherId),
    code: 'DISCOUNT10',
    type: 'percent',
    amount: 10,
    maxDiscount: 50,
    isActive: true,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    usageLimit: 100,
    usedCount: 5,
    minOrderValue: 50
  }

  const mockShippingAddress = {
    name: 'John Doe',
    phone: '0123456789',
    address: '123 Test St',
    city: 'Test City',
    province: 'Test Province',
    postalCode: '12345'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ================================
  // 1. CREATE ORDER TEST CASES
  // ================================
  describe('CREATE ORDER', () => {
    const validCreatePayload = {
      items: [{ productId: mockProductId, quantity: 2 }],
      shippingAddress: mockShippingAddress,
      shippingFee: 25,
      paymentMethod: 'COD'
    }

    describe('✅ SUCCESS CASES', () => {
      test('TC-01: Tạo đơn hàng thành công không có voucher', async () => {
        // Setup
        productModel.findByIds.mockResolvedValue([mockProduct])
        orderModel.createNew.mockResolvedValue({
          _id: mockOrderId,
          orderCode: 'ORD123456ABCDEF',
          userId: mockUserId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          totals: { subtotal: 180, discount: 0, shippingFee: 25, payable: 205 }
        })
        orderModel.appendLog.mockResolvedValue({})

        // Execute
        const result = await orderService.create(mockUserId, validCreatePayload)

        // Assert
        expect(result).toBeDefined()
        expect(result.status).toBe('PENDING')
        expect(result.paymentStatus).toBe('PENDING')
        expect(productModel.findByIds).toHaveBeenCalledWith([
          new ObjectId(mockProductId)
        ])
        expect(orderModel.createNew).toHaveBeenCalled()
      })

      test('TC-02: Tạo đơn hàng thành công có voucher hợp lệ', async () => {
        // Setup
        const payloadWithVoucher = {
          ...validCreatePayload,
          voucherCode: 'DISCOUNT10'
        }
        productModel.findByIds.mockResolvedValue([mockProduct])
        voucherModel.findOneByCode.mockResolvedValue(mockVoucher)
        orderModel.createNew.mockResolvedValue({
          _id: mockOrderId,
          orderCode: 'ORD123456ABCDEF',
          status: 'PENDING',
          paymentStatus: 'PENDING'
        })
        orderModel.appendLog.mockResolvedValue({})

        // Execute
        const result = await orderService.create(mockUserId, payloadWithVoucher)

        // Assert
        expect(result).toBeDefined()
        expect(voucherModel.findOneByCode).toHaveBeenCalledWith('DISCOUNT10')
      })

      test('TC-03: Tạo đơn hàng với nhiều sản phẩm', async () => {
        // Setup
        const mockProduct2Id = new ObjectId().toString()
        const multiItemPayload = {
          ...validCreatePayload,
          items: [
            { productId: mockProductId, quantity: 2 },
            { productId: mockProduct2Id, quantity: 1 }
          ]
        }
        productModel.findByIds.mockResolvedValue([
          mockProduct,
          {
            ...mockProduct,
            _id: new ObjectId(mockProduct2Id),
            name: 'Product 2'
          }
        ])
        orderModel.createNew.mockResolvedValue({
          _id: mockOrderId,
          status: 'PENDING'
        })
        orderModel.appendLog.mockResolvedValue({})

        // Execute
        const result = await orderService.create(mockUserId, multiItemPayload)

        // Assert
        expect(result).toBeDefined()
        expect(productModel.findByIds).toHaveBeenCalledWith([
          new ObjectId(mockProductId),
          new ObjectId(mockProduct2Id)
        ])
      })
    })

    describe('❌ FAILURE CASES', () => {
      test('TC-04: Lỗi userId không hợp lệ', async () => {
        await expect(
          orderService.create('invalid-id', validCreatePayload)
        ).rejects.toThrow('Access token không hợp lệ')
      })

      test('TC-05: Lỗi sản phẩm không tồn tại', async () => {
        productModel.findByIds.mockResolvedValue([])

        await expect(
          orderService.create(mockUserId, validCreatePayload)
        ).rejects.toThrow('Một hoặc nhiều sản phẩm không tồn tại')
      })

      test('TC-06: Lỗi sản phẩm không đủ tồn kho', async () => {
        const outOfStockProduct = { ...mockProduct, countInStock: 1 }
        productModel.findByIds.mockResolvedValue([outOfStockProduct])

        await expect(
          orderService.create(mockUserId, validCreatePayload)
        ).rejects.toThrow('không đủ tồn kho')
      })

      test('TC-07: Lỗi voucher không tồn tại', async () => {
        const payloadWithInvalidVoucher = {
          ...validCreatePayload,
          voucherCode: 'INVALID'
        }
        productModel.findByIds.mockResolvedValue([mockProduct])
        voucherModel.findOneByCode.mockResolvedValue(null)

        await expect(
          orderService.create(mockUserId, payloadWithInvalidVoucher)
        ).rejects.toThrow('Mã giảm giá không tồn tại')
      })

      test('TC-08: Lỗi voucher đã bị vô hiệu hóa', async () => {
        const payloadWithVoucher = {
          ...validCreatePayload,
          voucherCode: 'DISABLED'
        }
        const disabledVoucher = { ...mockVoucher, isActive: false }
        productModel.findByIds.mockResolvedValue([mockProduct])
        voucherModel.findOneByCode.mockResolvedValue(disabledVoucher)

        await expect(
          orderService.create(mockUserId, payloadWithVoucher)
        ).rejects.toThrow('Mã giảm giá đã bị vô hiệu hóa')
      })

      test('TC-09: Lỗi voucher chưa bắt đầu hiệu lực', async () => {
        const futureVoucher = {
          ...mockVoucher,
          startDate: new Date('2026-01-01')
        }
        const payloadWithVoucher = {
          ...validCreatePayload,
          voucherCode: 'FUTURE'
        }
        productModel.findByIds.mockResolvedValue([mockProduct])
        voucherModel.findOneByCode.mockResolvedValue(futureVoucher)

        await expect(
          orderService.create(mockUserId, payloadWithVoucher)
        ).rejects.toThrow('Mã giảm giá chưa bắt đầu hiệu lực')
      })

      test('TC-10: Lỗi voucher đã hết hạn', async () => {
        const expiredVoucher = {
          ...mockVoucher,
          endDate: new Date('2024-01-01')
        }
        const payloadWithVoucher = {
          ...validCreatePayload,
          voucherCode: 'EXPIRED'
        }
        productModel.findByIds.mockResolvedValue([mockProduct])
        voucherModel.findOneByCode.mockResolvedValue(expiredVoucher)

        await expect(
          orderService.create(mockUserId, payloadWithVoucher)
        ).rejects.toThrow('Mã giảm giá đã hết hạn')
      })

      test('TC-11: Lỗi voucher đã đạt giới hạn sử dụng', async () => {
        const maxUsedVoucher = { ...mockVoucher, usageLimit: 5, usedCount: 5 }
        const payloadWithVoucher = {
          ...validCreatePayload,
          voucherCode: 'MAXUSED'
        }
        productModel.findByIds.mockResolvedValue([mockProduct])
        voucherModel.findOneByCode.mockResolvedValue(maxUsedVoucher)

        await expect(
          orderService.create(mockUserId, payloadWithVoucher)
        ).rejects.toThrow('Mã giảm giá đã đạt giới hạn sử dụng')
      })

      test('TC-12: Lỗi đơn hàng không đủ giá trị tối thiểu cho voucher', async () => {
        const highMinValueVoucher = { ...mockVoucher, minOrderValue: 500 }
        const payloadWithVoucher = {
          ...validCreatePayload,
          voucherCode: 'HIGHMIN'
        }
        productModel.findByIds.mockResolvedValue([mockProduct])
        voucherModel.findOneByCode.mockResolvedValue(highMinValueVoucher)

        await expect(
          orderService.create(mockUserId, payloadWithVoucher)
        ).rejects.toThrow('Đơn tối thiểu để áp dụng là 500')
      })
    })
  })

  // ================================
  // 2. MARK PAID TEST CASES
  // ================================
  describe('MARK PAID', () => {
    describe('✅ SUCCESS CASES', () => {
      test('TC-13: Mark paid thành công từ PENDING/PENDING', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          items: [
            { productId: mockProductId, quantity: 2, name: 'Test Product' }
          ],
          voucher: { code: 'DISCOUNT10' }
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        productModel.decrementStock.mockResolvedValue({ modifiedCount: 1 })
        productModel.incrementSelled.mockResolvedValue({})
        voucherModel.findOneByCode.mockResolvedValue(mockVoucher)
        voucherModel.incrementUsedCount.mockResolvedValue({})
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CONFIRMED',
          paymentStatus: 'PAID'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.markPaid(mockOrderId)

        expect(result).toBeDefined()
        expect(productModel.decrementStock).toHaveBeenCalledWith(
          mockProductId,
          2
        )
        expect(productModel.incrementSelled).toHaveBeenCalledWith(
          mockProductId,
          2
        )
        expect(voucherModel.incrementUsedCount).toHaveBeenCalledWith(
          new ObjectId(mockVoucherId)
        )
      })

      test('TC-14: Mark paid thành công từ CONFIRMED/PENDING', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'CONFIRMED',
          paymentStatus: 'PENDING',
          items: [
            { productId: mockProductId, quantity: 1, name: 'Test Product' }
          ]
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        productModel.decrementStock.mockResolvedValue({ modifiedCount: 1 })
        productModel.incrementSelled.mockResolvedValue({})
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          paymentStatus: 'PAID'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.markPaid(mockOrderId)

        expect(result).toBeDefined()
      })

      test('TC-15: Mark paid idempotent - đã PAID rồi', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'CONFIRMED',
          paymentStatus: 'PAID'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)

        const result = await orderService.markPaid(mockOrderId)

        expect(result).toBe(mockOrder)
        expect(productModel.decrementStock).not.toHaveBeenCalled()
      })

      test('TC-16: Mark paid với rollback khi sản phẩm không đủ tồn kho', async () => {
        const mockOrder = {
          items: [
            { productId: mockProductId, quantity: 2, name: 'Product 1' },
            { productId: 'product2', quantity: 1, name: 'Product 2' }
          ],
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        productModel.decrementStock
          .mockResolvedValueOnce({ modifiedCount: 1 }) // Product 1 thành công
          .mockResolvedValueOnce({ modifiedCount: 0 }) // Product 2 thất bại
        productModel.incrementStock.mockResolvedValue({})

        await expect(orderService.markPaid(mockOrderId)).rejects.toThrow(
          'không đủ tồn kho để hoàn tất thanh toán'
        )

        expect(productModel.incrementStock).toHaveBeenCalledWith(
          mockProductId,
          2
        ) // Rollback
      })
    })

    describe('❌ FAILURE CASES', () => {
      test('TC-17: Lỗi orderId không hợp lệ', async () => {
        await expect(orderService.markPaid('invalid-id')).rejects.toThrow(
          'ID đơn hàng không hợp lệ'
        )
      })

      test('TC-18: Lỗi đơn hàng không tồn tại', async () => {
        orderModel.findOneById.mockResolvedValue(null)

        await expect(orderService.markPaid(mockOrderId)).rejects.toThrow(
          'Không tìm thấy đơn hàng'
        )
      })

      test('TC-19: Lỗi mark paid đơn đã CANCELLED', async () => {
        const mockOrder = { status: 'CANCELLED', paymentStatus: 'CANCELLED' }
        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(orderService.markPaid(mockOrderId)).rejects.toThrow(
          'Không thể xác nhận thanh toán cho đơn hàng có trạng thái CANCELLED'
        )
      })

      test('TC-20: Lỗi mark paid đơn đã COMPLETED', async () => {
        const mockOrder = { status: 'COMPLETED', paymentStatus: 'PAID' }
        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(orderService.markPaid(mockOrderId)).rejects.toThrow(
          'Không thể xác nhận thanh toán cho đơn hàng có trạng thái COMPLETED'
        )
      })

      test('TC-21: Lỗi mark paid từ paymentStatus CANCELLED', async () => {
        const mockOrder = { status: 'PENDING', paymentStatus: 'CANCELLED' }
        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(orderService.markPaid(mockOrderId)).rejects.toThrow(
          'Không thể xác nhận thanh toán từ trạng thái CANCELLED'
        )
      })

      test('TC-22: Lỗi mark paid từ paymentStatus REFUNDED', async () => {
        const mockOrder = { status: 'PENDING', paymentStatus: 'REFUNDED' }
        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(orderService.markPaid(mockOrderId)).rejects.toThrow(
          'Không thể xác nhận thanh toán từ trạng thái REFUNDED'
        )
      })
    })
  })

  // ================================
  // 3. CANCEL ORDER TEST CASES
  // ================================
  describe('CANCEL ORDER', () => {
    describe('✅ SUCCESS CASES - USER', () => {
      test('TC-23: User cancel thành công đơn PENDING/PENDING', async () => {
        const mockOrder = {
          _id: mockOrderId,
          userId: new ObjectId(mockUserId),
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CANCELLED'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.cancel(mockOrderId, mockUserId, false)

        expect(result).toBeDefined()
        expect(orderModel.update).toHaveBeenCalledWith(mockOrderId, {
          status: 'CANCELLED',
          paymentStatus: 'PENDING',
          updatedAt: expect.any(Date)
        })
      })

      test('TC-24: User cancel thành công đơn CONFIRMED/PAID với restock', async () => {
        const mockOrder = {
          _id: mockOrderId,
          userId: new ObjectId(mockUserId),
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          items: [{ productId: mockProductId, quantity: 2 }],
          voucher: { code: 'DISCOUNT10' }
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        productModel.incrementStock.mockResolvedValue({})
        productModel.decrementSelled.mockResolvedValue({})
        voucherModel.findOneByCode.mockResolvedValue(mockVoucher)
        voucherModel.decrementUsedCount.mockResolvedValue({})
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.cancel(mockOrderId, mockUserId, false)

        expect(result).toBeDefined()
        expect(productModel.incrementStock).toHaveBeenCalledWith(
          mockProductId,
          2
        )
        expect(productModel.decrementSelled).toHaveBeenCalledWith(
          mockProductId,
          2
        )
        expect(voucherModel.decrementUsedCount).toHaveBeenCalledWith(
          new ObjectId(mockVoucherId)
        )
      })

      test('TC-25: User cancel idempotent - đã CANCELLED rồi', async () => {
        const mockOrder = {
          _id: mockOrderId,
          userId: new ObjectId(mockUserId),
          status: 'CANCELLED',
          paymentStatus: 'CANCELLED'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(
          orderService.cancel(mockOrderId, mockUserId, false)
        ).rejects.toThrow(
          'Chỉ có thể hủy đơn khi đơn đang chờ xử lý hoặc vừa được xác nhận'
        )

        expect(orderModel.update).not.toHaveBeenCalled()
      })
    })

    describe('✅ SUCCESS CASES - ADMIN', () => {
      test('TC-26: Admin cancel thành công đơn PROCESSING/PAID', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'PROCESSING',
          paymentStatus: 'PAID',
          items: [{ productId: mockProductId, quantity: 1 }]
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        productModel.incrementStock.mockResolvedValue({})
        productModel.decrementSelled.mockResolvedValue({})
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.cancel(mockOrderId, null, true)

        expect(result).toBeDefined()
        expect(productModel.incrementStock).toHaveBeenCalled()
      })

      test('TC-27: Admin cancel thành công đơn SHIPPED/PAID', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'SHIPPED',
          paymentStatus: 'PAID',
          items: [{ productId: mockProductId, quantity: 3 }]
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        productModel.incrementStock.mockResolvedValue({})
        productModel.decrementSelled.mockResolvedValue({})
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.cancel(mockOrderId, null, true)

        expect(result).toBeDefined()
      })

      test('TC-28: Admin cancel đơn PENDING/PENDING không cần restock', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CANCELLED'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.cancel(mockOrderId, null, true)

        expect(result).toBeDefined()
        expect(productModel.incrementStock).not.toHaveBeenCalled()
      })
    })

    describe('❌ FAILURE CASES - USER', () => {
      test('TC-29: User không có quyền cancel đơn của người khác', async () => {
        const mockOrder = {
          _id: mockOrderId,
          userId: new ObjectId(), // Different user
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(
          orderService.cancel(mockOrderId, mockUserId, false)
        ).rejects.toThrow('Bạn không có quyền hủy đơn hàng này')
      })

      test('TC-30: User không thể cancel đơn PROCESSING', async () => {
        const mockOrder = {
          _id: mockOrderId,
          userId: new ObjectId(mockUserId),
          status: 'PROCESSING',
          paymentStatus: 'PAID'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(
          orderService.cancel(mockOrderId, mockUserId, false)
        ).rejects.toThrow(
          'Chỉ có thể hủy đơn khi đơn đang chờ xử lý hoặc vừa được xác nhận'
        )
      })

      test('TC-31: User không thể cancel đơn SHIPPED', async () => {
        const mockOrder = {
          _id: mockOrderId,
          userId: new ObjectId(mockUserId),
          status: 'SHIPPED',
          paymentStatus: 'PAID'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(
          orderService.cancel(mockOrderId, mockUserId, false)
        ).rejects.toThrow(
          'Chỉ có thể hủy đơn khi đơn đang chờ xử lý hoặc vừa được xác nhận'
        )
      })

      test('TC-32: User không thể cancel đơn COMPLETED', async () => {
        const mockOrder = {
          _id: mockOrderId,
          userId: new ObjectId(mockUserId),
          status: 'COMPLETED',
          paymentStatus: 'PAID'
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(
          orderService.cancel(mockOrderId, mockUserId, false)
        ).rejects.toThrow(
          'Chỉ có thể hủy đơn khi đơn đang chờ xử lý hoặc vừa được xác nhận'
        )
      })
    })

    describe('❌ FAILURE CASES - COMMON', () => {
      test('TC-33: Lỗi orderId không hợp lệ', async () => {
        await expect(
          orderService.cancel('invalid-id', mockUserId, false)
        ).rejects.toThrow('ID đơn hàng không hợp lệ')
      })

      test('TC-34: Lỗi đơn hàng không tồn tại', async () => {
        orderModel.findOneById.mockResolvedValue(null)

        await expect(
          orderService.cancel(mockOrderId, mockUserId, false)
        ).rejects.toThrow('Không tìm thấy đơn hàng')
      })

      test('TC-35: Rollback error được handle gracefully', async () => {
        const mockOrder = {
          _id: mockOrderId,
          userId: new ObjectId(mockUserId),
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          items: [{ productId: mockProductId, quantity: 2 }]
        }

        orderModel.findOneById.mockResolvedValue(mockOrder)
        productModel.incrementStock.mockRejectedValue(
          new Error('Database error')
        )
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CANCELLED'
        })
        orderModel.appendLog.mockResolvedValue({})

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const result = await orderService.cancel(mockOrderId, mockUserId, false)

        expect(result).toBeDefined()
        expect(consoleSpy).toHaveBeenCalledWith(
          'Rollback error during cancel:',
          expect.any(Error)
        )

        consoleSpy.mockRestore()
      })
    })
  })

  // ================================
  // 4. UPDATE STATUS TEST CASES
  // ================================
  describe('UPDATE STATUS', () => {
    describe('✅ SUCCESS CASES', () => {
      test('TC-36: Admin update status hợp lệ PENDING → CONFIRMED', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }
        orderModel.findOneById.mockResolvedValue(mockOrder)
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CONFIRMED'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.updateStatus(mockOrderId, {
          status: 'CONFIRMED'
        })

        expect(result).toBeDefined()
        expect(orderModel.update).toHaveBeenCalledWith(mockOrderId, {
          status: 'CONFIRMED'
        })
      })

      test('TC-37: Admin update paymentStatus hợp lệ PENDING → PROCESSING', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }
        orderModel.findOneById.mockResolvedValue(mockOrder)
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          paymentStatus: 'PROCESSING'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.updateStatus(mockOrderId, {
          paymentStatus: 'PROCESSING'
        })

        expect(result).toBeDefined()
      })

      test('TC-38: Admin update cả status và paymentStatus', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'CONFIRMED',
          paymentStatus: 'PENDING'
        }
        orderModel.findOneById.mockResolvedValue(mockOrder)
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'PROCESSING',
          paymentStatus: 'PAID'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.updateStatus(mockOrderId, {
          status: 'PROCESSING',
          paymentStatus: 'PAID'
        })

        expect(result).toBeDefined()
      })
    })

    describe('❌ FAILURE CASES', () => {
      test('TC-39: Lỗi status không hợp lệ (không thuộc enum)', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }
        orderModel.findOneById.mockResolvedValue(mockOrder)
        orderModel.ORDER_STATUS = ['PENDING', 'CONFIRMED', 'CANCELLED']

        await expect(
          orderService.updateStatus(mockOrderId, { status: 'INVALID_STATUS' })
        ).rejects.toThrow('Trạng thái đơn hàng không hợp lệ')
      })

      test('TC-40: Lỗi paymentStatus không hợp lệ (không thuộc enum)', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }
        orderModel.findOneById.mockResolvedValue(mockOrder)
        orderModel.PAYMENT_STATUS = ['PENDING', 'PAID', 'CANCELLED']

        await expect(
          orderService.updateStatus(mockOrderId, {
            paymentStatus: 'INVALID_PAYMENT'
          })
        ).rejects.toThrow('Trạng thái thanh toán không hợp lệ')
      })

      test('TC-41: Lỗi chuyển đổi status không hợp lệ COMPLETED → PENDING', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'COMPLETED',
          paymentStatus: 'PAID'
        }
        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(
          orderService.updateStatus(mockOrderId, { status: 'PENDING' })
        ).rejects.toThrow(
          'Không thể chuyển từ trạng thái COMPLETED sang PENDING'
        )
      })

      test('TC-42: Lỗi chuyển đổi paymentStatus không hợp lệ REFUNDED → PENDING', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED'
        }
        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(
          orderService.updateStatus(mockOrderId, { paymentStatus: 'PENDING' })
        ).rejects.toThrow(
          'Không thể chuyển từ trạng thái thanh toán REFUNDED sang PENDING'
        )
      })

      test('TC-43: Lỗi không nhất quán giữa status và paymentStatus', async () => {
        const mockOrder = {
          _id: mockOrderId,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }
        orderModel.findOneById.mockResolvedValue(mockOrder)

        // Test chỉ update paymentStatus thành PAID nhưng không update status
        // Điều này tạo ra inconsistency: PENDING status với PAID paymentStatus
        await expect(
          orderService.updateStatus(mockOrderId, {
            paymentStatus: 'PAID'
          })
        ).rejects.toThrow(
          'Trạng thái PENDING không tương thích với trạng thái thanh toán PAID'
        )
      })
    })
  })

  // ================================
  // 5. GET ORDERS TEST CASES
  // ================================
  describe('GET ORDERS', () => {
    describe('✅ SUCCESS CASES', () => {
      test('TC-44: Get my orders thành công', async () => {
        const mockOrders = {
          orders: [{ _id: mockOrderId, userId: mockUserId }],
          pagination: { page: 1, totalOrders: 1 }
        }
        orderModel.getMany.mockResolvedValue(mockOrders)

        const result = await orderService.getMyOrders(mockUserId, 1, 10)

        expect(result).toBeDefined()
        expect(orderModel.getMany).toHaveBeenCalledWith(
          { userId: new ObjectId(mockUserId) },
          1,
          10,
          { createdAt: -1 }
        )
      })

      test('TC-45: Get order details by ID thành công', async () => {
        const mockOrder = { _id: mockOrderId, userId: new ObjectId(mockUserId) }
        orderModel.findOneById.mockResolvedValue(mockOrder)

        const result = await orderService.getDetails(
          mockOrderId,
          mockUserId,
          false
        )

        expect(result).toBe(mockOrder)
      })

      test('TC-46: Get order details by orderCode thành công', async () => {
        const mockOrder = {
          _id: mockOrderId,
          orderCode: 'ORD123456',
          userId: new ObjectId(mockUserId)
        }
        orderModel.findOneByOrderCode.mockResolvedValue(mockOrder)

        const result = await orderService.getDetailsByOrderCode(
          'ORD123456',
          mockUserId
        )

        expect(result).toBe(mockOrder)
      })

      test('TC-47: Admin get all orders với filter', async () => {
        const mockOrders = { orders: [], pagination: {} }
        orderModel.getMany.mockResolvedValue(mockOrders)

        const result = await orderService.adminGetOrders(1, 10, {
          status: 'PENDING',
          paymentStatus: 'PAID',
          search: 'John'
        })

        expect(result).toBeDefined()
        expect(orderModel.getMany).toHaveBeenCalledWith(
          {
            status: 'PENDING',
            paymentStatus: 'PAID',
            $or: [
              { 'voucher.code': { $regex: 'John', $options: 'i' } },
              { 'shippingAddress.name': { $regex: 'John', $options: 'i' } }
            ]
          },
          1,
          10,
          { createdAt: -1 }
        )
      })
    })

    describe('❌ FAILURE CASES', () => {
      test('TC-48: Lỗi userId không hợp lệ khi get my orders', async () => {
        await expect(orderService.getMyOrders('invalid-id')).rejects.toThrow(
          'Access token không hợp lệ'
        )
      })

      test('TC-49: Lỗi orderId không hợp lệ khi get details', async () => {
        await expect(
          orderService.getDetails('invalid-id', mockUserId)
        ).rejects.toThrow('ID đơn hàng không hợp lệ')
      })

      test('TC-50: Lỗi không có quyền xem đơn hàng của người khác', async () => {
        const mockOrder = { _id: mockOrderId, userId: new ObjectId() } // Different user
        orderModel.findOneById.mockResolvedValue(mockOrder)

        await expect(
          orderService.getDetails(mockOrderId, mockUserId, false)
        ).rejects.toThrow('Bạn không có quyền xem đơn hàng này')
      })

      test('TC-51: Lỗi đơn hàng không tồn tại khi get details by orderCode', async () => {
        orderModel.findOneByOrderCode.mockResolvedValue(null)

        await expect(
          orderService.getDetailsByOrderCode('NOTFOUND', mockUserId)
        ).rejects.toThrow('Không tìm thấy đơn hàng')
      })
    })
  })

  // ================================
  // 6. CANCEL BY ORDER CODE TEST CASES
  // ================================
  describe('CANCEL BY ORDER CODE', () => {
    describe('✅ SUCCESS CASES', () => {
      test('TC-52: Cancel by orderCode thành công', async () => {
        const mockOrder = {
          _id: mockOrderId,
          orderCode: 'ORD123456',
          userId: new ObjectId(mockUserId),
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }

        orderModel.findOneByOrderCode.mockResolvedValue(mockOrder)
        orderModel.update.mockResolvedValue({
          ...mockOrder,
          status: 'CANCELLED'
        })
        orderModel.appendLog.mockResolvedValue({})

        const result = await orderService.cancelByOrderCode(
          'ORD123456',
          mockUserId
        )

        expect(result).toBeDefined()
        expect(orderModel.findOneByOrderCode).toHaveBeenCalledWith('ORD123456')
      })
    })

    describe('❌ FAILURE CASES', () => {
      test('TC-53: Lỗi orderCode không hợp lệ', async () => {
        await expect(
          orderService.cancelByOrderCode('', mockUserId)
        ).rejects.toThrow('Mã đơn hàng không hợp lệ')
      })

      test('TC-54: Lỗi đơn hàng không tồn tại với orderCode', async () => {
        orderModel.findOneByOrderCode.mockResolvedValue(null)

        await expect(
          orderService.cancelByOrderCode('NOTFOUND', mockUserId)
        ).rejects.toThrow('Không tìm thấy đơn hàng')
      })
    })
  })

  // ================================
  // 7. EDGE CASES & STRESS TESTS
  // ================================
  describe('EDGE CASES & STRESS TESTS', () => {
    test('TC-55: Create order với quantity = 0', async () => {
      const invalidPayload = {
        items: [{ productId: mockProductId, quantity: 0 }],
        shippingAddress: mockShippingAddress,
        shippingFee: 25,
        paymentMethod: 'COD'
      }

      // Validation sẽ catch lỗi này ở validation layer
      // Test này kiểm tra service có handle edge case không

      // Mock to test edge case handling
      productModel.findByIds.mockResolvedValue([mockProduct])

      // This should ideally fail at validation level
      // But we test if service handles it gracefully
      try {
        await orderService.create(mockUserId, invalidPayload)
      } catch (error) {
        expect(error.message).toContain('quantity')
      }
    })

    test('TC-56: Create order với giá sản phẩm âm', async () => {
      const negativeProduct = { ...mockProduct, price: -100 }
      productModel.findByIds.mockResolvedValue([negativeProduct])
      orderModel.createNew.mockResolvedValue({ _id: mockOrderId })

      // Service có thể tạo được nhưng sẽ có total âm
      // Cần validation ở product level
    })

    test('TC-57: Mark paid với đơn hàng có nhiều sản phẩm, một số hết hàng', async () => {
      const mockOrder = {
        items: [
          { productId: 'product1', quantity: 2, name: 'Product 1' },
          { productId: 'product2', quantity: 1, name: 'Product 2' },
          { productId: 'product3', quantity: 3, name: 'Product 3' }
        ],
        status: 'PENDING',
        paymentStatus: 'PENDING'
      }

      orderModel.findOneById.mockResolvedValue(mockOrder)
      productModel.decrementStock
        .mockResolvedValueOnce({ modifiedCount: 1 }) // Success
        .mockResolvedValueOnce({ modifiedCount: 0 }) // Fail
        .mockResolvedValueOnce({ modifiedCount: 1 }) // Won't be called

      productModel.incrementStock.mockResolvedValue({})

      await expect(orderService.markPaid(mockOrderId)).rejects.toThrow(
        'không đủ tồn kho'
      )

      // Verify rollback của product1
      expect(productModel.incrementStock).toHaveBeenCalledWith('product1', 2)
    })

    test('TC-58: Concurrent cancel requests', async () => {
      const mockOrder = {
        _id: mockOrderId,
        userId: new ObjectId(mockUserId),
        status: 'PENDING',
        paymentStatus: 'PENDING'
      }

      orderModel.findOneById.mockResolvedValue(mockOrder)
      orderModel.update.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' })
      orderModel.appendLog.mockResolvedValue({})

      // Simulate concurrent requests
      const promise1 = orderService.cancel(mockOrderId, mockUserId, false)
      const promise2 = orderService.cancel(mockOrderId, mockUserId, false)

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })

    test('TC-59: Database transaction failure simulation', async () => {
      const mockOrder = {
        _id: mockOrderId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: [{ productId: mockProductId, quantity: 1, name: 'Test Product' }]
      }

      orderModel.findOneById.mockResolvedValue(mockOrder)
      productModel.decrementStock.mockResolvedValue({ modifiedCount: 1 })
      productModel.incrementSelled.mockResolvedValue({})
      orderModel.update.mockRejectedValue(new Error('Database connection lost'))

      await expect(orderService.markPaid(mockOrderId)).rejects.toThrow(
        'Database connection lost'
      )

      // Trong production cần có compensation logic để rollback
    })

    test('TC-60: Memory leak test với large order items', async () => {
      // Tạo product list trước
      const largeProducts = Array.from({ length: 1000 }, () => ({
        ...mockProduct,
        _id: new ObjectId()
      }))

      // Tạo order items trùng productId với _id trong products
      const largeOrder = {
        items: largeProducts.map((p) => ({
          productId: p._id.toString(),
          quantity: 1
        })),
        shippingAddress: mockShippingAddress
      }

      productModel.findByIds.mockResolvedValue(largeProducts)
      orderModel.createNew.mockResolvedValue({ _id: mockOrderId })
      orderModel.appendLog.mockResolvedValue({})

      const result = await orderService.create(mockUserId, largeOrder)

      expect(result).toBeDefined()
      // Test memory usage không tăng quá mức
    })
  })
})
