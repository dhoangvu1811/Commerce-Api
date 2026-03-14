/**
 * Shipping Address Model
 * Quản lý địa chỉ giao hàng của người dùng
 */

import { prisma } from '~/config/prisma.js'
import type { ShippingAddress } from '@prisma/client'

export type { ShippingAddress }

/** Input tạo địa chỉ mới */
export interface CreateAddressInput {
  userId: number
  fullName: string
  phone: string
  address: string
  city: string
  province: string
  postalCode?: string
  isDefault?: boolean
}

/** Input cập nhật địa chỉ */
export interface UpdateAddressInput {
  fullName?: string
  phone?: string
  address?: string
  city?: string
  province?: string
  postalCode?: string
  isDefault?: boolean
}

/**
 * Tạo địa chỉ mới
 */
const createNew = async (
  data: CreateAddressInput
): Promise<ShippingAddress> => {
  // Nếu là địa chỉ đầu tiên hoặc được set default -> set isDefault = true
  // Lưu ý: Logic handle multiple default sẽ ở service layer hoặc transaction
  const address = await prisma.shippingAddress.create({
    data: {
      userId: data.userId,
      fullName: data.fullName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode ?? null,
      isDefault: data.isDefault ?? false
    }
  })

  return address
}

/**
 * Lấy danh sách địa chỉ của user
 */
const getByUserId = async (userId: number): Promise<ShippingAddress[]> => {
  const addresses = await prisma.shippingAddress.findMany({
    where: { userId, isActive: true },
    orderBy: [
      { isDefault: 'desc' }, // Default lên đầu
      { createdAt: 'desc' }
    ]
  })

  return addresses
}

/**
 * Lấy chi tiết địa chỉ
 */
const getOneById = async (id: number): Promise<ShippingAddress | null> => {
  const address = await prisma.shippingAddress.findUnique({
    where: { id }
  })

  return address
}

/**
 * Cập nhật địa chỉ
 */
const update = async (
  id: number,
  data: UpdateAddressInput
): Promise<ShippingAddress | null> => {
  try {
    const address = await prisma.shippingAddress.update({
      where: { id },
      data
    })

    return address
  } catch {
    return null
  }
}

/**
 * Xóa địa chỉ
 */
const deleteOne = async (id: number): Promise<ShippingAddress | null> => {
  try {
    const address = await prisma.shippingAddress.delete({
      where: { id }
    })

    return address
  } catch {
    return null
  }
}

/**
 * Reset default address của user (set tất cả về false)
 * Dùng trong transaction khi set address khác làm default
 */
const resetDefaultAddress = async (
  userId: number,
  excludeId?: number
): Promise<void> => {
  await prisma.shippingAddress.updateMany({
    where: {
      userId,
      isActive: true, // Only active addresses
      id: excludeId ? { not: excludeId } : undefined
    },
    data: { isDefault: false }
  })
}

/**
 * Đếm số lượng địa chỉ của user
 */
const countByUserId = async (userId: number): Promise<number> => {
  return await prisma.shippingAddress.count({
    where: { userId, isActive: true }
  })
}

export const shippingAddressModel = {
  createNew,
  getByUserId,
  getOneById,
  update,
  deleteOne,
  resetDefaultAddress,
  countByUserId
}
