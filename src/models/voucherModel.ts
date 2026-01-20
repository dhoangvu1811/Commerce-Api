/**
 * Voucher Model
 * Quản lý dữ liệu voucher/mã giảm giá trong MongoDB
 */

import { z } from 'zod'
import { coerceDateNullable } from '~/utils/zodValidators.js'
import { ObjectId } from 'mongodb'
import type {
  WithId,
  Document,
  Filter,
  Sort,
  DeleteResult,
  UpdateResult,
  ClientSession
} from 'mongodb'
import { GET_DB } from '~/config/mongodb.js'
import type {
  Voucher,
  CreateVoucherInput,
  UpdateVoucherInput,
  PaginatedVouchersModelResult
} from '~/types/voucher.types.js'

/** Tên collection trong MongoDB */
const VOUCHER_COLLECTION_NAME = 'vouchers'

/** Schema validation với Zod */
const VOUCHER_COLLECTION_SCHEMA = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9-_]+$/),
  type: z.enum(['percent', 'fixed']),
  amount: z.number().positive(),
  maxDiscount: z.number().min(0).default(0),
  minOrderValue: z.number().min(0).default(0),
  usageLimit: z.number().int().min(0).default(0), // 0 = không giới hạn
  usedCount: z.number().int().min(0).default(0),
  startDate: coerceDateNullable.default(null),
  endDate: coerceDateNullable.default(null),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
})

/** Voucher document từ MongoDB */
export type VoucherDocument = WithId<Document> & Voucher

/** Kết quả phân trang (alias từ types) */
export type PaginatedVouchersResult =
  PaginatedVouchersModelResult<VoucherDocument>

/** MongoDB session options */
interface SessionOptions {
  session?: ClientSession
}

/**
 * Validate dữ liệu trước khi tạo voucher
 */
const validateBeforeCreate = (data: CreateVoucherInput): CreateVoucherInput => {
  const validData = VOUCHER_COLLECTION_SCHEMA.parse(data)
  return validData as CreateVoucherInput
}

/**
 * Tạo voucher mới
 */
const createNew = async (
  data: CreateVoucherInput
): Promise<VoucherDocument | null> => {
  try {
    const validData = validateBeforeCreate(data)
    const created = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .insertOne(validData)

    return (await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOne({ _id: created.insertedId })) as VoucherDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm voucher theo ID
 */
const findOneById = async (
  voucherId: string
): Promise<VoucherDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(voucherId) })
    return result as VoucherDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm voucher theo code (case-insensitive)
 */
const findOneByCode = async (code: string): Promise<VoucherDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOne({ code: { $regex: new RegExp(`^${code}$`, 'i') } })
    return result as VoucherDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Lấy danh sách vouchers với phân trang
 */
const getMany = async (
  filter: Filter<Document> = {},
  page: number = 1,
  itemsPerPage: number = 10,
  sortOptions: Sort = { createdAt: -1 }
): Promise<PaginatedVouchersResult> => {
  try {
    const skip = (page - 1) * itemsPerPage

    const vouchers = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(itemsPerPage)
      .toArray()

    const totalVouchers = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .countDocuments(filter)

    const totalPages = Math.ceil(totalVouchers / itemsPerPage)

    return {
      vouchers: vouchers as VoucherDocument[],
      pagination: {
        page: parseInt(String(page)),
        itemsPerPage: parseInt(String(itemsPerPage)),
        totalVouchers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Cập nhật thông tin voucher
 */
const update = async (
  voucherId: string,
  updateData: UpdateVoucherInput
): Promise<VoucherDocument | null> => {
  try {
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    }

    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(voucherId) },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      )

    return result as VoucherDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Xóa voucher theo ID
 */
const deleteOneById = async (voucherId: string): Promise<DeleteResult> => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(voucherId) })
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tăng số lần sử dụng voucher
 */
const incrementUsedCount = async (
  voucherId: string,
  step: number = 1,
  options: SessionOptions = {}
): Promise<VoucherDocument | null> => {
  try {
    const updateOptions = options.session ? { session: options.session } : {}
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(voucherId) },
        { $inc: { usedCount: step }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after', ...updateOptions }
      )
    return result as VoucherDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Atomic increment với check usageLimit - Giải quyết race condition
 * Chỉ tăng usedCount nếu chưa đạt limit hoặc không có limit (usageLimit = 0)
 */
const incrementUsedCountWithLimit = async (
  voucherId: string,
  step: number = 1,
  options: SessionOptions = {}
): Promise<UpdateResult> => {
  try {
    const updateOptions = options.session ? { session: options.session } : {}
    // Atomic operation: Chỉ increment nếu:
    // - usageLimit = 0 (không giới hạn) HOẶC
    // - usedCount + step <= usageLimit
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .updateOne(
        {
          _id: new ObjectId(voucherId),
          $or: [
            { usageLimit: 0 },
            { $expr: { $lte: [{ $add: ['$usedCount', step] }, '$usageLimit'] } }
          ]
        },
        { $inc: { usedCount: step }, $set: { updatedAt: new Date() } },
        updateOptions
      )
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Giảm số lần đã sử dụng voucher (dùng khi hủy đơn đã thanh toán)
 * Sử dụng atomic operation với condition usedCount >= step để tránh negative value
 */
const decrementUsedCount = async (
  voucherId: string,
  step: number = 1,
  options: SessionOptions = {}
): Promise<VoucherDocument | null> => {
  try {
    const updateOptions = options.session ? { session: options.session } : {}
    // Atomic operation: Chỉ decrement nếu usedCount >= step
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(voucherId), usedCount: { $gte: step } },
        { $inc: { usedCount: -step }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after', ...updateOptions }
      )

    // Nếu không match (usedCount < step), set usedCount = 0 thay vì để negative
    if (!result) {
      const fallbackResult = await GET_DB()
        .collection(VOUCHER_COLLECTION_NAME)
        .findOneAndUpdate(
          { _id: new ObjectId(voucherId) },
          { $set: { usedCount: 0, updatedAt: new Date() } },
          { returnDocument: 'after', ...updateOptions }
        )
      return fallbackResult as VoucherDocument | null
    }

    return result as VoucherDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm nhiều vouchers theo danh sách IDs
 */
const findByIds = async (ids: ObjectId[]): Promise<VoucherDocument[]> => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .find({ _id: { $in: ids } })
      .toArray()
    return result as VoucherDocument[]
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Xóa nhiều vouchers theo danh sách IDs
 */
const deleteManyByIds = async (idStrings: string[]): Promise<DeleteResult> => {
  try {
    const objectIds = idStrings.map((id) => new ObjectId(id))
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .deleteMany({ _id: { $in: objectIds } })
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

export const voucherModel = {
  VOUCHER_COLLECTION_NAME,
  VOUCHER_COLLECTION_SCHEMA,
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
