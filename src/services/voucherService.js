/* eslint-disable indent */
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { voucherModel } from '~/models/voucherModel'
import { ObjectId } from 'mongodb'

const createNew = async (data) => {
  try {
    // Chuẩn hóa code về UPPERCASE không khoảng trắng
    const code = data.code?.toUpperCase().trim()

    // Check duplicate
    const existed = await voucherModel.findOneByCode(code)
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

    const newVoucher = {
      ...data,
      code,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const created = await voucherModel.createNew(newVoucher)
    return created
  } catch (error) {
    throw error
  }
}

const getDetails = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID voucher không hợp lệ')
    }
    const voucher = await voucherModel.findOneById(id)
    if (!voucher) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }
    return voucher
  } catch (error) {
    throw error
  }
}

const update = async (id, data) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID voucher không hợp lệ')
    }

    const existing = await voucherModel.findOneById(id)
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }

    // Nếu cập nhật code, kiểm tra trùng
    if (data.code) {
      const newCode = data.code.toUpperCase().trim()
      const duplicated = await voucherModel.findOneByCode(newCode)
      if (duplicated && duplicated?._id?.toString() !== id) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Mã voucher "${newCode}" đã tồn tại`
        )
      }
      data.code = newCode
    }

    // Nếu type = percent, kiểm tra amount <= 100
    if ((data.type || existing.type) === 'percent') {
      const amountToCheck =
        data.amount !== undefined ? data.amount : existing.amount
      if (Number(amountToCheck) > 100) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Giá trị phần trăm không được vượt quá 100%'
        )
      }
    }

    const updated = await voucherModel.update(id, {
      ...data,
      updatedAt: new Date()
    })
    return updated
  } catch (error) {
    throw error
  }
}

const deleteVoucher = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID voucher không hợp lệ')
    }

    const existing = await voucherModel.findOneById(id)
    if (!existing) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy voucher')
    }

    const result = await voucherModel.deleteOneById(id)
    return result
  } catch (error) {
    throw error
  }
}

const deleteMultiple = async (voucherIds) => {
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

const getVouchers = async (page = 1, itemsPerPage = 10, query = {}) => {
  try {
    const { search, type, isActive, sort } = query
    const filter = {}

    if (search) {
      filter.$or = [{ code: { $regex: search, $options: 'i' } }]
    }
    if (type) filter.type = type
    if (isActive !== undefined) filter.isActive = isActive === 'true'

    let sortOptions = { createdAt: -1 }
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
      parseInt(page),
      parseInt(itemsPerPage),
      sortOptions
    )
    return result
  } catch (error) {
    throw error
  }
}

// Kiểm tra voucher theo code và tổng tiền, trả về thông tin giảm giá và giá trị áp dụng
const verifyVoucher = async (code, orderTotal) => {
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

    if (discount > Number(orderTotal)) discount = Number(orderTotal)

    return {
      voucher,
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
  verifyVoucher
}
