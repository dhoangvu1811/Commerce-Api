/**
 * Review Service
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { reviewModel } from '~/models/reviewModel.js'
import { productModel } from '~/models/productModel.js'
import { prisma } from '~/config/prisma.js'
import { OrderStatus } from '~/generated/prisma/index.js'

/**
 * Tạo review mới
 */
const createNewReview = async (
  userId: number,
  data: { productId: number; rating: number; comment?: string }
) => {
  // 1. Check Product exists
  const product = await productModel.findOneById(data.productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }

  // 2. Check purchased & delivered
  // User must have an order with this product and status = DELIVERED
  const hasPurchased = await prisma.order.findFirst({
    where: {
      userId: userId,
      status: OrderStatus.DELIVERED,
      items: {
        some: {
          productId: data.productId
        }
      }
    }
  })

  if (!hasPurchased) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Bạn chỉ có thể đánh giá sản phẩm đã mua và đã nhận hàng thành công'
    )
  }

  // 3. Check duplicate review
  const hasReviewed = await reviewModel.checkUserReviewed(
    userId,
    data.productId
  )
  if (hasReviewed) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Bạn đã đánh giá sản phẩm này rồi'
    )
  }

  // 4. Create review
  const newReview = await reviewModel.create({ ...data, userId })

  // 5. Recalculate Product Rating
  // Calculate new average
  const newAverage = await reviewModel.calculateAverageRating(data.productId)

  // Update product rating (Round to 1 decimal place, e.g., 4.5)
  const roundedRating = Math.round(newAverage * 10) / 10

  // Update product rating
  await productModel.update(data.productId, {
    rating: roundedRating
  })

  return newReview
}

/**
 * Láy reviews của sản phẩm
 */
const getProductReviews = async (productId: number) => {
  // Check product exist? Optional, schema findMany returns empty array if not found
  return await reviewModel.findByProductId(productId)
}

export const reviewService = {
  createNewReview,
  getProductReviews
}
