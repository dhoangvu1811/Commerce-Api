/**
 * Cart Controller
 * API endpoints cho giỏ hàng
 */

import { StatusCodes } from 'http-status-codes'
import type { Request, Response, NextFunction } from 'express'
import { cartService } from '~/services/cartService.js'

/**
 * Láy giỏ hàng
 */
const getMyCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const result = await cartService.getMyCart(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy giỏ hàng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Thêm vào giỏ
 */
const addToCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const productId = parseInt(req.body.productId, 10)
    const quantity = parseInt(req.body.quantity, 10)

    const result = await cartService.addToCart(userId, productId, quantity)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Thêm vào giỏ hàng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update số lượng
 */
const updateCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const productId = parseInt(req.body.productId, 10)
    const quantity = parseInt(req.body.quantity, 10)

    const result = await cartService.updateCartItem(userId, productId, quantity)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật giỏ hàng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Xóa item
 * productId lấy từ params cho chuẩn REST: DELETE /cart/items/:productId
 */
const removeCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const productId = parseInt(req.params.productId as string, 10)

    await cartService.removeCartItem(userId, productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa sản phẩm khỏi giỏ hàng thành công'
    })
  } catch (error) {
    next(error)
  }
}

export const cartController = {
  getMyCart,
  addToCart,
  updateCart,
  removeCartItem
}
