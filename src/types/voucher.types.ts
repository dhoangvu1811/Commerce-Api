/**
 * Voucher type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps } from './common.types.js'

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
  startDate?: Date | string
  endDate?: Date | string
  isActive?: boolean
  description?: string
}

/**
 * Kết quả lấy danh sách vouchers
 */
export interface GetVouchersResult {
  vouchers: Voucher[]
  pagination: {
    page: number
    itemsPerPage: number
    totalVouchers: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
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
