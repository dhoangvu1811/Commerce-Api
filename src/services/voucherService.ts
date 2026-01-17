/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Voucher Service - Prisma Version
 * Xử lý logic business cho voucher
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import {
  voucherModel,
  type Voucher,
  type VoucherFilter
} from '~/models/voucherModel.js'
import { VoucherType } from '~/generated/prisma/index.js'
import { prisma } from '~/config/prisma.js'
import type {
  VoucherQueryFilter,
  VerifyVoucherResult
} from '~/types/voucher.types.js'
import type { PaginationInfo, DeleteResultInfo } from '~/types/common.types.js'

/** Paginated vouchers result */
interface PaginatedVouchersResult {
  vouchers: Voucher[]
  pagination: PaginationInfo
}

/**
 * Parse voucherId string to number
 */
const parseVoucherId = (voucherId: string): number => {
  const id = parseInt(voucherId, 10)
  if (isNaN(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID voucher không hợp lệ')
  }
  return id
}

/**
 * Lấy danh sách voucher đang hoạt động cho người dùng (public)
 */
const getActivePublic = async (
  limit: number = 100
): Promise<PaginatedVouchersResult> => {
  try {
    const now = new Date()

    // Use Prisma query instead of MongoDB aggregation
    const vouchers = await prisma.voucher.findMany({
      where: {
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [
          {
            OR: [{ endDate: null }, { endDate: { gte: now } }]
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Filter those where usedCount < usageLimit (or usageLimit is null/0)
    const activeVouchers = vouchers.filter(
      (v: { usageLimit: number | null; usedCount: number }) => {
        if (!v.usageLimit || v.usageLimit === 0) return true
        return v.usedCount < v.usageLimit
      }
    )

    return {
      vouchers: activeVouchers,
      pagination: {
        page: 1,
        itemsPerPage: limit,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Tạo voucher mới
 */
const createNew = async (data: {
  code: string
  type: VoucherType
  amount: number
  maxDiscount?: number | null
  minOrderValue?: number | null
  usageLimit?: number | null
  startDate?: Date | string | null
  endDate?: Date | string | null
  isActive?: boolean
  description?: string | null
}): Promise<Voucher> => {
  try {
    // Chuẩn hóa code về UPPERCASE
    const code = data.code.toUpperCase().trim()

    // Check duplicate
    const existed = await voucherModel.findOneByCode(code)
    if (existed) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Mã voucher "${code}" đã tồn tại`
      )
    }

    // Ràng buộc: nếu type = percent thì amount <= 100
    if (data.type === VoucherType.percent && Number(data.amount) > 100) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Giá trị phần trăm không được vượt quá 100%'
      )
    }

    // Validate startDate và endDate
    let startDate: Date | null = null
    let endDate: Date | null = null

    if (data.startDate) {
      startDate = new Date(data.startDate)
    }
    if (data.endDate) {
      endDate = new Date(data.endDate)
    }

    // Validate endDate > startDate
    if (startDate && endDate && endDate <= startDate) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Ngày kết thúc phải sau ngày bắt đầu'
      )
    }

    const created = await voucherModel.createNew({
      code,
      type: data.type,
      amount: data.amount,
      maxDiscount: data.maxDiscount ?? null,
      minOrderValue: data.minOrderValue ?? null,
      usageLimit: data.usageLimit ?? null,
      startDate,
      endDate,
      isActive: data.isActive ?? true,
      description: data.description ?? null
    })

    return created
  } catch (error) {
    throw error
  }
}

/**
 * Lấy chi tiết voucher
 */
const getDetails = async (id: string): Promise<Voucher> => {
  try {
    const voucherId = parseVoucherId(id)
    const voucher = await voucherModel.findOneById(voucherId)

    if (!voucher) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }

    return voucher
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật voucher
 */
const update = async (
  id: string,
  data: Partial<{
    code: string
    type: VoucherType
    amount: number
    maxDiscount: number | null
    minOrderValue: number | null
    usageLimit: number | null
    startDate: Date | string | null
    endDate: Date | string | null
    isActive: boolean
    description: string | null
  }>
): Promise<Voucher> => {
  try {
    const voucherId = parseVoucherId(id)

    const existing = await voucherModel.findOneById(voucherId)
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }

    // Clone data
    const updateData: Record<string, unknown> = { ...data }

    // Nếu cập nhật code, kiểm tra trùng
    if (updateData.code) {
      const newCode = (updateData.code as string).toUpperCase().trim()
      const duplicated = await voucherModel.findOneByCode(newCode)
      if (duplicated && duplicated.id !== voucherId) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Mã voucher "${newCode}" đã tồn tại`
        )
      }
      updateData.code = newCode
    }

    // Nếu type = percent, kiểm tra amount <= 100
    const typeToCheck = (updateData.type as VoucherType) || existing.type
    if (typeToCheck === VoucherType.percent) {
      const amountToCheck =
        updateData.amount !== undefined
          ? updateData.amount
          : Number(existing.amount)
      if (Number(amountToCheck) > 100) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Giá trị phần trăm không được vượt quá 100%'
        )
      }
    }

    // Validate and convert dates
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate as string)
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate as string)
    }

    // Validate endDate > startDate
    if (
      updateData.startDate &&
      updateData.endDate &&
      (updateData.endDate as Date) <= (updateData.startDate as Date)
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Ngày kết thúc phải sau ngày bắt đầu'
      )
    }

    const updated = await voucherModel.update(voucherId, updateData)

    if (!updated) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Không thể cập nhật voucher'
      )
    }

    return updated
  } catch (error) {
    throw error
  }
}

/**
 * Xóa voucher
 */
const deleteVoucher = async (id: string): Promise<DeleteResultInfo> => {
  try {
    const voucherId = parseVoucherId(id)

    const existing = await voucherModel.findOneById(voucherId)
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }

    const result = await voucherModel.deleteOneById(voucherId)

    return {
      deletedCount: result ? 1 : 0,
      message: 'Đã xóa voucher thành công'
    } as DeleteResultInfo
  } catch (error) {
    throw error
  }
}

/**
 * Xóa nhiều vouchers
 */
const deleteMultiple = async (
  voucherIds: string[]
): Promise<DeleteResultInfo> => {
  try {
    if (!voucherIds || !Array.isArray(voucherIds) || voucherIds.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Danh sách ID voucher không hợp lệ'
      )
    }

    // Parse all IDs
    const numberIds = voucherIds.map((id) => {
      const num = parseInt(id, 10)
      if (isNaN(num)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `ID voucher không hợp lệ: ${id}`
        )
      }
      return num
    })

    // Check existing
    const existing = await voucherModel.findByIds(numberIds)
    const existingIds = existing.map((v) => v.id)
    const notFound = numberIds.filter((id) => !existingIds.includes(id))

    if (notFound.length > 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Không tìm thấy voucher với ID: ${notFound.join(', ')}`
      )
    }

    const result = await voucherModel.deleteManyByIds(numberIds)

    return {
      deletedCount: result.count,
      message: `Đã xóa ${result.count} voucher được chọn`,
      deletedIds: voucherIds
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy danh sách vouchers với phân trang và filter
 */
const getVouchers = async (
  page: number = 1,
  itemsPerPage: number = 10,
  query: VoucherQueryFilter = {}
): Promise<PaginatedVouchersResult> => {
  try {
    const { search, type, isActive, sort } = query

    // Build Prisma filter
    const filter: VoucherFilter = {}

    if (search) {
      filter.search = search
    }
    if (type) {
      filter.type = type
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }

    // Build orderBy
    let orderBy: { [key: string]: 'asc' | 'desc' } = { createdAt: 'desc' }

    if (sort) {
      switch (sort) {
        case 'code_asc':
          orderBy = { code: 'asc' }
          break
        case 'code_desc':
          orderBy = { code: 'desc' }
          break
        case 'amount_desc':
          orderBy = { amount: 'desc' }
          break
        case 'amount_asc':
          orderBy = { amount: 'asc' }
          break
        default:
          orderBy = { createdAt: 'desc' }
      }
    }

    const result = await voucherModel.getMany(
      filter,
      page,
      itemsPerPage,
      orderBy
    )

    return result
  } catch (error) {
    throw error
  }
}

/**
 * Kiểm tra voucher theo code và tổng tiền
 */
const verifyVoucher = async (
  code: string,
  orderTotal: number
): Promise<VerifyVoucherResult> => {
  try {
    if (!code) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng nhập mã giảm giá')
    }

    const voucher = await voucherModel.findOneByCode(code.toUpperCase().trim())
    if (!voucher) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Mã giảm giá không tồn tại')
    }

    if (!voucher.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Mã giảm giá đã bị vô hiệu hóa'
      )
    }

    const now = new Date()
    if (voucher.startDate && new Date(voucher.startDate) > now) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Mã giảm giá chưa bắt đầu hiệu lực'
      )
    }
    if (voucher.endDate && new Date(voucher.endDate) < now) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Mã giảm giá đã hết hạn')
    }

    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Mã giảm giá đã đạt giới hạn sử dụng'
      )
    }

    if (
      voucher.minOrderValue &&
      Number(orderTotal) < Number(voucher.minOrderValue)
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Đơn tối thiểu để áp dụng là ${voucher.minOrderValue}`
      )
    }

    // Tính toán giảm giá
    let discount = 0
    if (voucher.type === VoucherType.percent) {
      discount = (Number(orderTotal) * Number(voucher.amount)) / 100
      if (voucher.maxDiscount && discount > Number(voucher.maxDiscount)) {
        discount = Number(voucher.maxDiscount)
      }
    } else {
      discount = Number(voucher.amount)
    }

    if (discount > Number(orderTotal)) {
      discount = Number(orderTotal)
    }

    return {
      voucher: voucher as unknown as import('~/types/voucher.types.js').Voucher,
      discount,
      payable: Number(orderTotal) - discount
    }
  } catch (error) {
    throw error
  }
}

export const voucherService = {
  createNew,
  getDetails,
  update,
  deleteVoucher,
  deleteMultiple,
  getVouchers,
  verifyVoucher,
  getActivePublic
}
