/**
 * Wishlist Service
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { wishlistModel } from '~/models/wishlistModel.js'
import { productModel } from '~/models/productModel.js'

/**
 * Toggle (Thêm/Xóa) sản phẩm yêu thích
 */
const toggleWishlist = async (userId: number, productId: number) => {
  // Check product exists
  const product = await productModel.findOneById(productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }

  const existingItem = await wishlistModel.checkExist(userId, productId)

  if (existingItem) {
    await wishlistModel.remove(userId, productId)

    return {
      action: 'removed',
      message: 'Đã xóa khỏi danh sách yêu thích'
    }
  } else {
    const count = await wishlistModel.countByUserId(userId)
    if (count >= 50) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Danh sách yêu thích tối đa 50 sản phẩm'
      )
    }

    await wishlistModel.add(userId, productId)

    return {
      action: 'added',
      message: 'Đã thêm vào danh sách yêu thích'
    }
  }
}

/**
 * Lấy danh sách yêu thích
 */
const getMyWishlist = async (userId: number) => {
  return await wishlistModel.getByUserId(userId)
}

export const wishlistService = {
  toggleWishlist,
  getMyWishlist
}
