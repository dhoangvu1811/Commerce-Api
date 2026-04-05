/**
 * Payment Controller
 * Điều phối API thanh toán qua PayPal.
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { paymentService } from '~/services/paymentService.js'

const paypalCreateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const { orderCode } = req.body
    const result = await paymentService.createPaypalOrder(userId, orderCode)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Tạo phiên thanh toán PayPal thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const paypalCaptureOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const { orderCode, paypalOrderId } = req.body
    const result = await paymentService.capturePaypalOrder(userId, orderCode, paypalOrderId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xác nhận thanh toán PayPal thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const paymentController = {
  paypalCreateOrder,
  paypalCaptureOrder
}
