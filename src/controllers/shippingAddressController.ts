/**
 * Shipping Address Controller
 * Điều phối API request cho địa chỉ giao hàng
 */

import { StatusCodes } from 'http-status-codes'
import type { Request, Response, NextFunction } from 'express'
import { shippingAddressService } from '~/services/shippingAddressService.js'

/**
 * Tạo địa chỉ mới
 */
const createNew = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const result = await shippingAddressService.createNew(userId, req.body)

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Thêm địa chỉ giao hàng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách địa chỉ của tôi
 */
const getMyAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const result = await shippingAddressService.getMyAddresses(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách địa chỉ thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy chi tiết địa chỉ
 */
const getAddressDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const addressId = parseInt(req.params.id as string, 10)
    const result = await shippingAddressService.getAddressDetail(
      userId,
      addressId
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết địa chỉ thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Cập nhật địa chỉ
 */
const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const addressId = parseInt(req.params.id as string, 10)
    const result = await shippingAddressService.updateAddress(
      userId,
      addressId,
      req.body
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật địa chỉ thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Xóa địa chỉ
 */
const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const addressId = parseInt(req.params.id as string, 10)
    await shippingAddressService.deleteAddress(userId, addressId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa địa chỉ thành công'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Set default address
 */
const setDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const addressId = parseInt(req.params.id as string, 10)
    const result = await shippingAddressService.setDefaultAddress(
      userId,
      addressId
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đặt làm địa chỉ mặc định thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const shippingAddressController = {
  createNew,
  getMyAddresses,
  getAddressDetail,
  updateAddress,
  deleteAddress,
  setDefaultAddress
}
