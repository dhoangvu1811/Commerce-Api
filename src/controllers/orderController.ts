/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Order Controller
 * Điều phối API requests cho orders
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { orderService } from '~/services/orderService.js'
import type { OrderStatus, PaymentStatus } from '~/types/order.types.js'

const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const created = await orderService.create(userId, req.body)

    // Chỉ trả về thông tin cần thiết cho user, không bao gồm ID internal
    const responseData = {
      orderCode: created.orderCode,
      status: created.status,
      paymentStatus: created.paymentStatus,
      totals: created.totals,
      createdAt: created.createdAt
    }

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo đơn hàng thành công',
      data: responseData
    })
  } catch (error) {
    next(error)
  }
}

const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const { page, itemsPerPage } = req.query || {}
    const result = await orderService.getMyOrders(
      userId,
      page ? parseInt(page as string) : 1,
      itemsPerPage ? parseInt(itemsPerPage as string) : 10
    )
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách đơn hàng của tôi thành công',
      data: result
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
    const userId = req.jwtDecoded!._id
    const id = req.params.id!
    const order = await orderService.getDetails(id, userId, false)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order
    })
  } catch (error) {
    next(error)
  }
}

// Admin
const adminGetOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, itemsPerPage, status, paymentStatus, search } =
      req.query || {}
    const result = await orderService.adminGetOrders(
      page ? parseInt(page as string) : 1,
      itemsPerPage ? parseInt(itemsPerPage as string) : 10,
      {
        status: status as OrderStatus | undefined,
        paymentStatus: paymentStatus as PaymentStatus | undefined,
        search: search as string | undefined
      }
    )
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách đơn hàng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const adminGetDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id!
    const order = await orderService.getDetails(id, '', true)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order
    })
  } catch (error) {
    next(error)
  }
}

const adminUpdateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id!
    const { status } = req.body
    const adminId = req.jwtDecoded!._id

    // Chỉ update status, không đụng đến paymentStatus
    const updated = await orderService.updateStatus(id, { status }, adminId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const adminUpdatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id!
    const { paymentStatus } = req.body
    const adminId = req.jwtDecoded!._id

    // Chỉ update paymentStatus, không đụng đến status
    const updated = await orderService.updatePaymentStatus(
      id,
      { paymentStatus },
      adminId
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật trạng thái thanh toán thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const adminMarkPaid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id!
    const adminId = req.jwtDecoded!._id
    const updated = await orderService.markPaid(id, adminId)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xác nhận thanh toán thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const userCancel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id!
    const userId = req.jwtDecoded!._id
    const updated = await orderService.cancel(id, userId, false)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Hủy đơn hàng thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const adminCancel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id!
    const adminId = req.jwtDecoded!._id
    const updated = await orderService.cancel(id, adminId, true)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Hủy đơn hàng (admin) thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const adminGetOrderLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orderId = req.params.id!
    const result = await orderService.adminGetOrderLogs(orderId)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy lịch sử thay đổi đơn hàng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const orderController = {
  create,
  getMyOrders,
  getDetails,
  adminGetOrders,
  adminGetDetails,
  adminUpdateStatus,
  adminUpdatePaymentStatus,
  adminMarkPaid,
  userCancel,
  adminCancel,
  adminGetOrderLogs
}
