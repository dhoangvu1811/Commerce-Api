/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Voucher Service
 * Xử lý logic business cho voucher
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { voucherModel } from '~/models/voucherModel.js'
import { ObjectId } from 'mongodb'
import type {
  Voucher,
  VoucherQueryFilter,
  VoucherMongoFilter,
  ActivePublicVoucherFilter,
  VerifyVoucherResult
} from '~/types/voucher.types.js'
import type {
  PaginationInfo,
  SortOptions,
  DeleteResultInfo
} from '~/types/common.types.js'

/** Paginated vouchers result */
interface PaginatedVouchersResult {
  vouchers: Voucher[]
  pagination: PaginationInfo
}

/**
 * Lấy danh sách voucher đang hoạt động cho người dùng (public)
 */
const getActivePublic = async (
  limit: number = 100
): Promise<PaginatedVouchersResult> => {
  try {
    const now = new Date()

    const filter: ActivePublicVoucherFilter = {
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        {
          $or: [
            { usageLimit: 0 },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
          ]
        }
      ]
    }

    const result = await voucherModel.getMany(filter, 1, limit, {
      createdAt: -1
    })

    return result as PaginatedVouchersResult
  } catch (error) {
    throw error
  }
}

/**
 * Tạo voucher mới
 */
const createNew = async (data: Partial<Voucher>): Promise<Voucher> => {
  try {
    // Chuẩn hóa code về UPPERCASE không khoảng trắng
    const code = data.code?.toUpperCase().trim()

    // Check duplicate
    const existed = await voucherModel.findOneByCode(code!)
    if (existed) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Mã voucher "${code}" đã tồn tại`
      )
    }

    // Ràng buộc thêm: nếu type = percent thì amount <= 100
    if (data.type === 'percent' && Number(data.amount) > 100) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Giá trị phần trăm không được vượt quá 100%'
      )
    }

    // Validate startDate và endDate
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (data.startDate) {
      startDate = new Date(data.startDate)
    }
    if (data.endDate) {
      endDate = new Date(data.endDate)
    }

    // Validate endDate > startDate nếu cả hai đều có giá trị
    if (startDate && endDate && endDate <= startDate) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Ngày kết thúc phải sau ngày bắt đầu'
      )
    }

    const newVoucher: Partial<Voucher> = {
      ...data,
      code,
      startDate,
      endDate,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const created = await voucherModel.createNew(newVoucher as Voucher)

    return created as Voucher
  } catch (error) {
    throw error
  }
}

/**
 * Lấy chi tiết voucher
 */
const getDetails = async (id: string): Promise<Voucher> => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID voucher không hợp lệ')
    }

    const voucher = await voucherModel.findOneById(id)
    if (!voucher) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }

    return voucher as Voucher
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật voucher
 */
const update = async (id: string, data: Partial<Voucher>): Promise<Voucher> => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID voucher không hợp lệ')
    }

    const existing = await voucherModel.findOneById(id)
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }

    // Clone data để không mutate object gốc
    const updateData: Partial<Voucher> = { ...data }

    // Nếu cập nhật code, kiểm tra trùng
    if (updateData.code) {
      const newCode = updateData.code.toUpperCase().trim()
      const duplicated = await voucherModel.findOneByCode(newCode)
      if (duplicated && duplicated?._id?.toString() !== id) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Mã voucher "${newCode}" đã tồn tại`
        )
      }
      updateData.code = newCode
    }

    // Nếu type = percent, kiểm tra amount <= 100
    const typeToCheck = updateData.type || existing.type
    if (typeToCheck === 'percent') {
      const amountToCheck =
        updateData.amount !== undefined ? updateData.amount : existing.amount
      if (Number(amountToCheck) > 100) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Giá trị phần trăm không được vượt quá 100%'
        )
      }
    }

    // Validate and convert startDate và endDate thành Date objects
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate)
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate)
    }

    // Validate endDate > startDate nếu cả hai đều có giá trị
    if (
      updateData.startDate &&
      updateData.endDate &&
      updateData.endDate <= updateData.startDate
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Ngày kết thúc phải sau ngày bắt đầu'
      )
    }

    const updated = await voucherModel.update(id, {
      ...updateData,
      updatedAt: new Date()
    })

    return updated as Voucher
  } catch (error) {
    throw error
  }
}

/**
 * Xóa voucher
 */
const deleteVoucher = async (id: string): Promise<DeleteResultInfo> => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID voucher không hợp lệ')
    }

    const existing = await voucherModel.findOneById(id)
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }

    const result = await voucherModel.deleteOneById(id)

    return result as DeleteResultInfo
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

    // Validate ObjectId format
    const invalid = voucherIds.filter((id) => !ObjectId.isValid(id))
    if (invalid.length > 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `ID voucher không hợp lệ: ${invalid.join(', ')}`
      )
    }

    const objectIds = voucherIds.map((id) => new ObjectId(id))

    const existing = await voucherModel.findByIds(objectIds)
    const existingIds = existing.map((v) => v?._id?.toString())
    const notFound = voucherIds.filter((id) => !existingIds.includes(id))

    if (notFound.length > 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Không tìm thấy voucher với ID: ${notFound.join(', ')}`
      )
    }

    const result = await voucherModel.deleteManyByIds(voucherIds)

    return {
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} voucher được chọn`,
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
    const filter: VoucherMongoFilter = {}

    if (search) {
      filter.$or = [{ code: { $regex: search, $options: 'i' } }]
    }
    if (type) {
      filter.type = type
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }

    let sortOptions: SortOptions = { createdAt: -1 }
    if (sort) {
      switch (sort) {
        case 'code_asc':
          sortOptions = { code: 1 }
          break
        case 'code_desc':
          sortOptions = { code: -1 }
          break
        case 'amount_desc':
          sortOptions = { amount: -1 }
          break
        case 'amount_asc':
          sortOptions = { amount: 1 }
          break
        default:
          sortOptions = { createdAt: -1 }
      }
    }

    const result = await voucherModel.getMany(
      filter,
      page,
      itemsPerPage,
      sortOptions
    )

    return result as PaginatedVouchersResult
  } catch (error) {
    throw error
  }
}

/**
 * Kiểm tra voucher theo code và tổng tiền, trả về thông tin giảm giá và giá trị áp dụng
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
    if (voucher.type === 'percent') {
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
      voucher: voucher as Voucher,
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
