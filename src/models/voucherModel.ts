/**
 * Voucher Model - Prisma Version
 * Quản lý dữ liệu voucher/mã giảm giá
 */

import { prisma } from '~/config/prisma.js'
import type { Voucher, Prisma } from '@prisma/client'
import type { VoucherType } from '@prisma/client'

type Decimal = Prisma.Decimal

/** Voucher type export từ Prisma */
export type { Voucher }

/** Paginated result cho vouchers */
export interface PaginatedVouchersResult {
  vouchers: Voucher[]
  pagination: {
    page: number
    itemsPerPage: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/** Input tạo voucher mới */
export interface CreateVoucherInput {
  code: string
  type: VoucherType
  amount: number | Decimal
  maxDiscount?: number | Decimal | null
  minOrderValue?: number | Decimal | null
  usageLimit?: number | null
  usedCount?: number
  startDate?: Date | null
  endDate?: Date | null
  isActive?: boolean
  description?: string | null
}

/** Input cập nhật voucher */
export interface UpdateVoucherInput {
  code?: string
  type?: VoucherType
  amount?: number | Decimal
  maxDiscount?: number | Decimal | null
  minOrderValue?: number | Decimal | null
  usageLimit?: number | null
  startDate?: Date | null
  endDate?: Date | null
  isActive?: boolean
  description?: string | null
}

/** Filter cho getMany */
export interface VoucherFilter {
  search?: string
  type?: VoucherType
  isActive?: boolean
}

/**
 * Tạo voucher mới
 */
const createNew = async (data: CreateVoucherInput): Promise<Voucher> => {
  const voucher = await prisma.voucher.create({
    data: {
      code: data.code.toUpperCase().trim(),
      type: data.type,
      amount: data.amount,
      maxDiscount: data.maxDiscount ?? null,
      minOrderValue: data.minOrderValue ?? null,
      usageLimit: data.usageLimit ?? null,
      usedCount: data.usedCount ?? 0,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      isActive: data.isActive ?? true,
      description: data.description ?? null
    }
  })

  return voucher
}

/**
 * Tìm voucher theo ID
 */
const findOneById = async (voucherId: number): Promise<Voucher | null> => {
  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId }
  })

  return voucher
}

/**
 * Tìm voucher theo code (case-insensitive)
 */
const findOneByCode = async (code: string): Promise<Voucher | null> => {
  const voucher = await prisma.voucher.findFirst({
    where: {
      code: { equals: code.toUpperCase().trim(), mode: 'insensitive' }
    }
  })

  return voucher
}

/**
 * Lấy danh sách vouchers với phân trang
 */
const getMany = async (
  filter: VoucherFilter = {},
  page: number = 1,
  itemsPerPage: number = 10,
  orderBy: Prisma.VoucherOrderByWithRelationInput = { createdAt: 'desc' }
): Promise<PaginatedVouchersResult> => {
  const skip = (page - 1) * itemsPerPage

  // Build where clause
  const where: Prisma.VoucherWhereInput = {}

  if (filter.search) {
    where.code = { contains: filter.search, mode: 'insensitive' }
  }
  if (filter.type) {
    where.type = filter.type
  }
  if (filter.isActive !== undefined) {
    where.isActive = filter.isActive
  }

  const [vouchers, totalVouchers] = await Promise.all([
    prisma.voucher.findMany({
      where,
      orderBy,
      skip,
      take: itemsPerPage
    }),
    prisma.voucher.count({ where })
  ])

  const totalPages = Math.ceil(totalVouchers / itemsPerPage)

  return {
    vouchers,
    pagination: {
      page,
      itemsPerPage,
      totalItems: totalVouchers,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Cập nhật thông tin voucher
 */
const update = async (voucherId: number, updateData: UpdateVoucherInput): Promise<Voucher | null> => {
  try {
    const voucher = await prisma.voucher.update({
      where: { id: voucherId },
      data: updateData
    })

    return voucher
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Voucher không tồn tại
    }
    // Re-throw other errors (validation, constraint violations, etc.)
    throw error
  }
}

/**
 * Xóa voucher theo ID
 */
const deleteOneById = async (voucherId: number): Promise<Voucher | null> => {
  try {
    const voucher = await prisma.voucher.delete({
      where: { id: voucherId }
    })

    return voucher
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Voucher không tồn tại
    }
    // Re-throw other errors (constraint violations, etc.)
    throw error
  }
}

/**
 * Tăng số lần sử dụng voucher
 */
const incrementUsedCount = async (voucherId: number, step: number = 1): Promise<Voucher | null> => {
  try {
    const voucher = await prisma.voucher.update({
      where: { id: voucherId },
      data: { usedCount: { increment: step } }
    })

    return voucher
  } catch {
    return null
  }
}

/**
 * Atomic increment với check usageLimit - Giải quyết race condition
 * Chỉ tăng usedCount nếu chưa đạt limit hoặc không có limit
 * @param tx Optional transaction client để sử dụng trong transaction
 */
const incrementUsedCountWithLimit = async (
  voucherId: number,
  step: number = 1,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; modifiedCount: number }> => {
  const client = tx || prisma
  try {
    // Sử dụng raw SQL cho atomic operation với condition
    const result = await client.$executeRaw`
      UPDATE vouchers 
      SET used_count = used_count + ${step}, updated_at = NOW()
      WHERE id = ${voucherId} 
      AND (usage_limit IS NULL OR usage_limit = 0 OR used_count + ${step} <= usage_limit)
    `

    return { success: result > 0, modifiedCount: result }
  } catch (error) {
    // Log error for debugging
    console.error('Error in incrementUsedCountWithLimit:', error)

    return { success: false, modifiedCount: 0 }
  }
}

/**
 * Giảm số lần đã sử dụng voucher (dùng khi hủy đơn)
 * @param tx Optional transaction client để sử dụng trong transaction
 */
const decrementUsedCount = async (
  voucherId: number,
  step: number = 1,
  tx?: Prisma.TransactionClient
): Promise<Voucher | null> => {
  const client = tx || prisma
  try {
    // Giảm usedCount nhưng không để âm
    const result = await client.$executeRaw`
      UPDATE vouchers 
      SET used_count = GREATEST(0, used_count - ${step}), updated_at = NOW()
      WHERE id = ${voucherId}
    `

    if (result > 0) {
      return await client.voucher.findUnique({ where: { id: voucherId } })
    }

    return null
  } catch (error) {
    // Log error for debugging
    console.error('Error in decrementUsedCount:', error)

    return null
  }
}

/**
 * Tìm nhiều vouchers theo danh sách IDs
 */
const findByIds = async (ids: number[]): Promise<Voucher[]> => {
  const vouchers = await prisma.voucher.findMany({
    where: { id: { in: ids } }
  })

  return vouchers
}

/**
 * Xóa nhiều vouchers theo danh sách IDs
 */
const deleteManyByIds = async (ids: number[]): Promise<{ count: number }> => {
  const result = await prisma.voucher.deleteMany({
    where: { id: { in: ids } }
  })

  return { count: result.count }
}

export const voucherModel = {
  createNew,
  findOneById,
  findOneByCode,
  getMany,
  update,
  deleteOneById,
  incrementUsedCount,
  incrementUsedCountWithLimit,
  decrementUsedCount,
  findByIds,
  deleteManyByIds
}
