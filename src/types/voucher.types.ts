/**
 * Voucher type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps, PaginationInfo } from './common.types.js'

/**
 * Loại voucher
 */
export type VoucherType = 'percent' | 'fixed'

/**
 * Voucher document trong MongoDB
 */
export interface Voucher extends Timestamps {
  _id?: ObjectId
  code: string
  type: VoucherType
  amount: number
  maxDiscount: number
  minOrderValue: number
  usageLimit: number
  usedCount: number
  startDate: Date
  endDate: Date
  isActive: boolean
  description: string
}

/**
 * Input tạo voucher mới
 */
export interface CreateVoucherInput {
  code: string
  type: VoucherType
  amount: number
  maxDiscount?: number
  minOrderValue?: number
  usageLimit?: number
  startDate: Date | string
  endDate: Date | string
  description?: string
}

/**
 * Input cập nhật voucher
 */
export interface UpdateVoucherInput {
  code?: string
  type?: VoucherType
  amount?: number
  maxDiscount?: number
  minOrderValue?: number
  usageLimit?: number
  startDate?: Date | string | null
  endDate?: Date | string | null
  isActive?: boolean
  description?: string
  updatedAt?: Date
}

/**
 * Kết quả lấy danh sách vouchers
 */
export interface GetVouchersResult {
  vouchers: Voucher[]
  pagination: PaginationInfo & {
    totalVouchers: number
  }
}

/**
 * Kết quả validate voucher
 */
export interface ValidateVoucherResult {
  valid: boolean
  voucher?: Voucher
  discountAmount?: number
  message?: string
}

/**
 * Voucher query filter cho service
 */
export interface VoucherQueryFilter {
  search?: string
  type?: VoucherType
  isActive?: string
  sort?: string
}

/**
 * MongoDB filter for vouchers
 */
export interface VoucherMongoFilter {
  $or?: Array<{ code: { $regex: string; $options: string } }>
  type?: VoucherType
  isActive?: boolean
}

/**
 * MongoDB filter for active public vouchers
 */
export interface ActivePublicVoucherFilter {
  isActive: boolean
  $and: Array<
    | { $or: Array<{ startDate: null } | { startDate: { $lte: Date } }> }
    | { $or: Array<{ endDate: null } | { endDate: { $gte: Date } }> }
    | {
        $or: Array<
          { usageLimit: number } | { $expr: { $lt: [string, string] } }
        >
      }
  >
}

/**
 * Paginated vouchers model result (generic)
 */
export interface PaginatedVouchersModelResult<T = Voucher> {
  vouchers: T[]
  pagination: PaginationInfo & {
    totalVouchers: number
  }
}

/**
 * Verify voucher result
 */
export interface VerifyVoucherResult {
  voucher: Voucher
  discount: number
  payable: number
}

/**
 * Extended input để tạo voucher với các field bổ sung
 */
export interface CreateVoucherInputExtended extends CreateVoucherInput {
  usedCount?: number
}
