/**
 * Wishlist Controller
 */

import { StatusCodes } from 'http-status-codes'
import type { Request, Response, NextFunction } from 'express'
import { wishlistService } from '~/services/wishlistService.js'

/**
 * Lấy danh sách yêu thích
 */
const getMyWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const result = await wishlistService.getMyWishlist(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách yêu thích thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Toggle yêu thích
 */
const toggleWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const productId = parseInt(req.body.productId, 10)

    const result = await wishlistService.toggleWishlist(userId, productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: result.message,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const wishlistController = {
  getMyWishlist,
  toggleWishlist
}
