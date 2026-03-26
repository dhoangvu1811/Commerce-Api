/**
 * Shipping Controller
 * APIs dùng cho chọn địa chỉ và tính phí giao hàng.
 */

import type { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ghnService } from '~/services/ghnService.js'

const getProvinces = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ghnService.getProvinces()

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách tỉnh/thành thành công',
      data
    })
  } catch (error) {
    next(error)
  }
}

const getDistricts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provinceId = Number(req.query.provinceId)
    const data = await ghnService.getDistricts(provinceId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách quận/huyện thành công',
      data
    })
  } catch (error) {
    next(error)
  }
}

const getWards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const districtId = Number(req.query.districtId)
    const data = await ghnService.getWards(districtId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách phường/xã thành công',
      data
    })
  } catch (error) {
    next(error)
  }
}

const getServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const toDistrictId = Number(req.query.toDistrictId)
    const data = await ghnService.getAvailableServices(toDistrictId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách dịch vụ vận chuyển thành công',
      data
    })
  } catch (error) {
    next(error)
  }
}

const quote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ghnService.quoteFee(req.body)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Tính phí giao hàng thành công',
      data
    })
  } catch (error) {
    next(error)
  }
}

export const shippingController = {
  getProvinces,
  getDistricts,
  getWards,
  getServices,
  quote
}
