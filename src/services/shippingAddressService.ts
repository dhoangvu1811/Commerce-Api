/**
 * Shipping Address Service
 * Xử lý logic business cho địa chỉ giao hàng
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import {
  shippingAddressModel,
  type CreateAddressInput,
  type UpdateAddressInput,
  type ShippingAddress
} from '~/models/shippingAddressModel.js'
import { prisma } from '~/config/prisma.js'

/**
 * Tạo địa chỉ mới
 */
const createNew = async (
  userId: number,
  data: Omit<CreateAddressInput, 'userId'>
): Promise<ShippingAddress> => {
  // Check limit (ví dụ max 10 addresses)
  const count = await shippingAddressModel.countByUserId(userId)
  if (count >= 10) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Bạn chỉ được lưu tối đa 10 địa chỉ'
    )
  }

  // Nếu là địa chỉ đầu tiên, luôn set default
  if (count === 0) {
    data.isDefault = true
  }

  // Nếu set default, reset các địa chỉ cũ trong transaction
  if (data.isDefault) {
    return await prisma.$transaction(async (tx) => {
      // Reset all to false
      await tx.shippingAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      })

      // Create new
      return await tx.shippingAddress.create({
        data: {
          ...data,
          userId,
          postalCode: data.postalCode ?? null,
          isDefault: true
        }
      })
    })
  }

  // Normal create
  return await shippingAddressModel.createNew({ ...data, userId })
}

/**
 * Lấy danh sách địa chỉ (chỉ lấy active)
 */
const getMyAddresses = async (userId: number): Promise<ShippingAddress[]> => {
  return await prisma.shippingAddress.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Lấy chi tiết địa chỉ
 */
const getAddressDetail = async (
  userId: number,
  addressId: number
): Promise<ShippingAddress> => {
  const address = await shippingAddressModel.getOneById(addressId)
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Địa chỉ không tồn tại')
  }
  // Check quyền sở hữu
  if (address.userId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Bạn không có quyền truy cập địa chỉ này'
    )
  }

  return address
}

/**
 * Cập nhật địa chỉ (Copy-on-Write if used in Orders)
 */
const updateAddress = async (
  userId: number,
  addressId: number,
  data: UpdateAddressInput
): Promise<ShippingAddress> => {
  const address = await shippingAddressModel.getOneById(addressId)
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Địa chỉ không tồn tại')
  }
  if (address.userId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Bạn không có quyền cập nhật địa chỉ này'
    )
  }

  // Nếu set default
  if (data.isDefault === false && address.isDefault) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Bạn không thể bỏ địa chỉ mặc định. Vui lòng chọn địa chỉ khác làm mặc định.'
    )
  }

  // Check usage in orders
  const usedInOrders = await prisma.order.count({
    where: { shippingAddressId: addressId }
  })

  // Nếu đã dùng trong đơn hàng -> Copy-on-Write
  if (usedInOrders > 0) {
    return await prisma.$transaction(async (tx) => {
      // 1. Archive cũ
      await tx.shippingAddress.update({
        where: { id: addressId },
        data: { isActive: false, isDefault: false } // Bỏ default của cái cũ
      })

      // 2. Reset others default if needed
      if (data.isDefault) {
        await tx.shippingAddress.updateMany({
          where: { userId, isActive: true },
          data: { isDefault: false }
        })
      }

      // 3. Create new
      const newAddress = await tx.shippingAddress.create({
        data: {
          userId,
          fullName: data.fullName || address.fullName,
          phone: data.phone || address.phone,
          address: data.address || address.address,
          city: data.city || address.city,
          province: data.province || address.province,
          postalCode: data.postalCode ?? address.postalCode,
          isActive: true, // New logic: Active
          isDefault: data.isDefault ?? address.isDefault
        }
      })

      return newAddress
    })
  }

  // Nếu chưa dùng -> Update trực tiếp
  if (data.isDefault) {
    return await prisma.$transaction(async (tx) => {
      // Reset others
      await tx.shippingAddress.updateMany({
        where: { userId, id: { not: addressId }, isActive: true },
        data: { isDefault: false }
      })
      // Update target
      const updated = await tx.shippingAddress.update({
        where: { id: addressId },
        data: { ...data, isDefault: true }
      })

      return updated
    })
  }

  // Normal update
  const updated = await shippingAddressModel.update(addressId, data)
  if (!updated) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Cập nhật thất bại')
  }

  return updated
}

/**
 * Xóa địa chỉ
 */
const deleteAddress = async (
  userId: number,
  addressId: number
): Promise<boolean> => {
  const address = await shippingAddressModel.getOneById(addressId)
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Địa chỉ không tồn tại')
  }
  if (address.userId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Bạn không có quyền xóa địa chỉ này'
    )
  }

  // Nếu xóa địa chỉ default, warning user hoặc auto set cái khác (ở đây chọn throw error bắt user set cái khác trước)
  if (address.isDefault) {
    // Check nếu còn địa chỉ khác
    const count = await shippingAddressModel.countByUserId(userId)
    if (count > 1) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Bạn không thể xóa địa chỉ mặc định. Vui lòng thiết lập địa chỉ khác làm mặc định trước.'
      )
    }
    // Nếu chỉ còn 1 cái (là cái này) thì cho xóa -> User hết địa chỉ, ok.
  }

  // Check if used in orders
  const usedInOrders = await prisma.order.count({
    where: { shippingAddressId: addressId }
  })

  // Nếu đã dùng trong đơn hàng -> Soft delete (isActive = false)
  if (usedInOrders > 0) {
    // Nếu xóa default address, vẫn phải check logic default
    if (address.isDefault) {
      // ... (Logic check default retained from original but applies to soft delete too)
      // Check nếu còn địa chỉ khác active
      const count = await prisma.shippingAddress.count({
        where: { userId, isActive: true }
      })
      if (count > 1) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Bạn không thể xóa địa chỉ mặc định. Vui lòng thiết lập địa chỉ khác làm mặc định trước.'
        )
      }
    }

    await prisma.shippingAddress.update({
      where: { id: addressId },
      data: { isActive: false, isDefault: false }
    })

    return true
  }

  const result = await shippingAddressModel.deleteOne(addressId)

  return !!result
}

/**
 * Set default address (Shortcut)
 */
const setDefaultAddress = async (
  userId: number,
  addressId: number
): Promise<ShippingAddress> => {
  return await updateAddress(userId, addressId, { isDefault: true })
}

export const shippingAddressService = {
  createNew,
  getMyAddresses,
  getAddressDetail,
  updateAddress,
  deleteAddress,
  setDefaultAddress
}
