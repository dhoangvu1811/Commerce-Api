/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Voucher Controller
 * Điều phối API requests cho vouchers
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { voucherService } from '~/services/voucherService.js'
import type { VoucherType } from '~/types/voucher.types.js'

const createNew = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const created = await voucherService.createNew(req.body)
    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo voucher thành công',
      data: created
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id)
    const voucher = await voucherService.getDetails(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết voucher thành công',
      data: voucher
    })
  } catch (error) {
    next(error)
  }
}

const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id)
    const updated = await voucherService.update(id, req.body)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật voucher thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const deleteVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id)
    const result = await voucherService.deleteVoucher(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa voucher thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getVouchers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, itemsPerPage, search, type, isActive, sort } = req.query || {}
    const query = {
      search: search as string | undefined,
      type: type as VoucherType | undefined,
      isActive: isActive as string | undefined,
      sort: sort as string | undefined
    }
    const result = await voucherService.getVouchers(
      page ? parseInt(page as string) : 1,
      itemsPerPage ? parseInt(itemsPerPage as string) : 10,
      query
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách voucher thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const verifyVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, orderTotal } = req.body || {}
    const result = await voucherService.verifyVoucher(code, orderTotal)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Áp dụng voucher thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteMultiple = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { voucherIds } = req.body || {}
    const result = await voucherService.deleteMultiple(voucherIds)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa các voucher được chọn thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getActivePublic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit } = req.query || {}
    const vouchers = await voucherService.getActivePublic(
      limit ? parseInt(limit as string) : undefined
    )
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách voucher đang hoạt động thành công',
      data: vouchers
    })
  } catch (error) {
    next(error)
  }
}

export const voucherController = {
  createNew,
  getDetails,
  update,
  deleteVoucher,
  deleteMultiple,
  getVouchers,
  verifyVoucher,
  getActivePublic
}
