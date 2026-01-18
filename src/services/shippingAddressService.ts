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
 * Láy danh sách địa chỉ
 */
const getMyAddresses = async (userId: number): Promise<ShippingAddress[]> => {
  return await shippingAddressModel.getByUserId(userId)
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
 * Cập nhật địa chỉ
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

  if (data.isDefault) {
    return await prisma.$transaction(async (tx) => {
      // Reset others
      await tx.shippingAddress.updateMany({
        where: { userId, id: { not: addressId } },
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
