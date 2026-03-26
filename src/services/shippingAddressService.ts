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
const createNew = async (userId: number, data: Omit<CreateAddressInput, 'userId'>): Promise<ShippingAddress> => {
  const normalizedDistrict = typeof data.district === 'string' ? data.district.trim() : ''
  const normalizedProvince = typeof data.province === 'string' ? data.province.trim() : ''

  if (!normalizedDistrict) {
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Tên Quận/Huyện là bắt buộc')
  }

  if (!normalizedProvince) {
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Tên Tỉnh/Thành là bắt buộc')
  }

  // Check limit (ví dụ max 10 addresses)
  const count = await shippingAddressModel.countByUserId(userId)
  if (count >= 10) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn chỉ được lưu tối đa 10 địa chỉ')
  }

  // Nếu là địa chỉ đầu tiên, luôn set default
  if (count === 0) {
    data.isDefault = true
  }

  // Nếu set default, reset các địa chỉ cũ trong transaction
  if (data.isDefault) {
    return await prisma.$transaction(async tx => {
      // Reset chỉ các địa chỉ active (không cần reset địa chỉ đã archive)
      await tx.shippingAddress.updateMany({
        where: { userId, isActive: true },
        data: { isDefault: false }
      })

      // Create new
      return await tx.shippingAddress.create({
        data: {
          userId,
          fullName: data.fullName,
          phone: data.phone,
          addressLine: data.addressLine,
          fullAddress: data.fullAddress,
          provinceId: data.provinceId,
          districtId: data.districtId,
          district: normalizedDistrict,
          province: normalizedProvince,
          wardCode: data.wardCode,
          ward: data.ward,
          postalCode: data.postalCode ?? null,
          isDefault: true
        }
      })
    })
  }

  // Normal create
  return await shippingAddressModel.createNew({
    ...data,
    district: normalizedDistrict,
    province: normalizedProvince,
    userId
  })
}

/**
 * Lấy danh sách địa chỉ (chỉ lấy active)
 */
const getMyAddresses = async (userId: number): Promise<ShippingAddress[]> => {
  return await prisma.shippingAddress.findMany({
    where: { userId, isActive: true },
    orderBy: [
      { isDefault: 'desc' }, // Địa chỉ mặc định lên đầu
      { createdAt: 'desc' }
    ]
  })
}

/**
 * Lấy chi tiết địa chỉ
 */
const getAddressDetail = async (userId: number, addressId: number): Promise<ShippingAddress> => {
  const address = await shippingAddressModel.getOneById(addressId)
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Địa chỉ không tồn tại')
  }
  // Check quyền sở hữu
  if (address.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập địa chỉ này')
  }

  return address
}

/**
 * Cập nhật địa chỉ (Copy-on-Write if used in Orders)
 */
const updateAddress = async (userId: number, addressId: number, data: UpdateAddressInput): Promise<ShippingAddress> => {
  const address = await shippingAddressModel.getOneById(addressId)
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Địa chỉ không tồn tại')
  }
  if (address.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật địa chỉ này')
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
    return await prisma.$transaction(async tx => {
      // 1. Archive cũ
      await tx.shippingAddress.update({
        where: { id: addressId },
        data: { isActive: false, isDefault: false }
      })

      // 2. Tính effective isDefault: ưu tiên giá trị mới, fallback về giá trị gốc
      // Quan trọng: nếu địa chỉ gốc là default nhưng payload không truyền isDefault
      // → effectiveIsDefault = true → cần reset others TRƯỚC khi tạo mới
      // Nếu chỉ check data.isDefault (undefined → falsy) thì sẽ bỏ qua reset → 2 default tồn tại
      const effectiveIsDefault = data.isDefault ?? address.isDefault

      // 3. Reset others nếu địa chỉ mới sẽ là default
      if (effectiveIsDefault) {
        await tx.shippingAddress.updateMany({
          where: { userId, isActive: true },
          data: { isDefault: false }
        })
      }

      // 4. Create new
      const oldAddress = address as ShippingAddress & {
        addressLine?: string
        fullAddress?: string
        provinceId?: number
        districtId?: number
        district?: string
        wardCode?: string
        ward?: string
      }

      const newAddress = await tx.shippingAddress.create({
        data: {
          userId,
          fullName: data.fullName || address.fullName,
          phone: data.phone || address.phone,
          addressLine: data.addressLine || oldAddress.addressLine || address.addressLine,
          fullAddress: data.fullAddress || oldAddress.fullAddress || address.fullAddress,
          provinceId: data.provinceId || oldAddress.provinceId || 0,
          districtId: data.districtId || oldAddress.districtId || 0,
          district: data.district || oldAddress.district || address.district,
          province: data.province || address.province,
          wardCode: data.wardCode || oldAddress.wardCode || '',
          ward: data.ward || oldAddress.ward || '',
          postalCode: data.postalCode ?? address.postalCode,
          isActive: true,
          isDefault: effectiveIsDefault
        }
      })

      return newAddress
    })
  }

  // Nếu chưa dùng -> Update trực tiếp
  if (data.isDefault) {
    return await prisma.$transaction(async tx => {
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
  const updatePayload: UpdateAddressInput = {
    ...data
  }

  const updated = await shippingAddressModel.update(addressId, updatePayload)
  if (!updated) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Cập nhật thất bại')
  }

  return updated
}

/**
 * Xóa địa chỉ
 */
const deleteAddress = async (userId: number, addressId: number): Promise<boolean> => {
  const address = await shippingAddressModel.getOneById(addressId)
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Địa chỉ không tồn tại')
  }
  if (address.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền xóa địa chỉ này')
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
  // Không hard delete để giữ nguyên lịch sử đơn hàng liên kết
  // (Check default address đã được xử lý ở trên trước khi vào đây)
  if (usedInOrders > 0) {
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
 * Set default address
 * Xử lý trực tiếp bằng transaction, KHÔNG qua updateAddress để tránh kích hoạt
 * Copy-on-Write không cần thiết — thay đổi isDefault không ảnh hưởng dữ liệu
 * lịch sử đơn hàng, nên không cần tạo bản ghi địa chỉ mới.
 */
const setDefaultAddress = async (userId: number, addressId: number): Promise<ShippingAddress> => {
  const address = await shippingAddressModel.getOneById(addressId)
  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Địa chỉ không tồn tại')
  }
  if (address.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền cập nhật địa chỉ này')
  }
  if (!address.isActive) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Địa chỉ không còn hoạt động')
  }
  // No-op nếu đã là default
  if (address.isDefault) return address

  return await prisma.$transaction(async tx => {
    // Reset tất cả active addresses về false
    await tx.shippingAddress.updateMany({
      where: { userId, isActive: true },
      data: { isDefault: false }
    })

    // Set target thành default
    return await tx.shippingAddress.update({
      where: { id: addressId },
      data: { isDefault: true }
    })
  })
}

export const shippingAddressService = {
  createNew,
  getMyAddresses,
  getAddressDetail,
  updateAddress,
  deleteAddress,
  setDefaultAddress
}
