/* eslint-disable @typescript-eslint/no-explicit-any */

import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { voucherService } from '~/services/voucherService.js'
import { voucherModel } from '~/models/voucherModel.js'
import { VoucherType } from '@prisma/client'

const expectApiError = async (promise: Promise<unknown>, statusCode: number): Promise<void> => {
  await expect(promise).rejects.toMatchObject({ statusCode })
}

afterEach(() => {
  vi.restoreAllMocks()
})

const baseVoucher = {
  id: 1,
  code: 'TEST',
  type: VoucherType.fixed,
  amount: 50000,
  maxDiscount: null,
  minOrderValue: null,
  usageLimit: null,
  usedCount: 0,
  startDate: null,
  endDate: null,
  isActive: true
}

describe('voucherService.verifyVoucher (Deep Logic Testing)', () => {
  test('VCH-VRF-HP-001 should calculate fixed discount correctly', async () => {
    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue(baseVoucher as any)

    const result = await voucherService.verifyVoucher('TEST', 100000)

    expect(result.discount).toBe(50000)
    expect(result.payable).toBe(50000)
  })

  test('VCH-VRF-HP-002 should calculate percent discount correctly without maxDiscount', async () => {
    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue({
      ...baseVoucher,
      type: VoucherType.percent,
      amount: 20 // 20%
    } as any)

    const result = await voucherService.verifyVoucher('TEST', 100000)

    expect(result.discount).toBe(20000)
    expect(result.payable).toBe(80000)
  })

  test('VCH-VRF-HP-003 should cap percent discount at maxDiscount', async () => {
    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue({
      ...baseVoucher,
      type: VoucherType.percent,
      amount: 20, // 20%
      maxDiscount: 15000 // Cap at 15k
    } as any)

    const result = await voucherService.verifyVoucher('TEST', 100000)

    // 20% of 100k is 20k, but cap is 15k
    expect(result.discount).toBe(15000)
    expect(result.payable).toBe(85000)
  })

  test('VCH-VRF-EG-001 should not allow discount to exceed orderTotal', async () => {
    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue({
      ...baseVoucher,
      type: VoucherType.fixed,
      amount: 150000 // Discount > Order Total
    } as any)

    const result = await voucherService.verifyVoucher('TEST', 100000)

    expect(result.discount).toBe(100000)
    expect(result.payable).toBe(0)
  })

  test('VCH-VRF-ER-001 should reject if order total is less than minOrderValue', async () => {
    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue({
      ...baseVoucher,
      minOrderValue: 200000
    } as any)

    await expectApiError(voucherService.verifyVoucher('TEST', 100000), StatusCodes.BAD_REQUEST)
  })

  test('VCH-VRF-ER-002 should reject if voucher is inactive', async () => {
    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue({
      ...baseVoucher,
      isActive: false
    } as any)

    await expectApiError(voucherService.verifyVoucher('TEST', 100000), StatusCodes.BAD_REQUEST)
  })

  test('VCH-VRF-ER-003 should reject if voucher is expired', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue({
      ...baseVoucher,
      endDate: yesterday
    } as any)

    await expectApiError(voucherService.verifyVoucher('TEST', 100000), StatusCodes.BAD_REQUEST)
  })

  test('VCH-VRF-ER-004 should reject if voucher usage limit is reached', async () => {
    vi.spyOn(voucherModel, 'findOneByCode').mockResolvedValue({
      ...baseVoucher,
      usageLimit: 10,
      usedCount: 10
    } as any)

    await expectApiError(voucherService.verifyVoucher('TEST', 100000), StatusCodes.BAD_REQUEST)
  })
})
