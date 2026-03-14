/**
 * Review Service
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { reviewModel } from '~/models/reviewModel.js'
import { productModel } from '~/models/productModel.js'
import { prisma } from '~/config/prisma.js'
import { OrderStatus } from '@prisma/client'

interface ReviewPayload {
  productId: number
  rating: number
  comment?: string
}

const ensureValidProductId = (productId: number): void => {
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID sản phẩm không hợp lệ')
  }
}

const checkUserPurchasedDeliveredProduct = async (
  userId: number,
  productId: number
): Promise<boolean> => {
  const order = await prisma.order.findFirst({
    where: {
      userId,
      status: OrderStatus.DELIVERED,
      items: {
        some: {
          productId
        }
      }
    }
  })

  return Boolean(order)
}

/**
 * Tạo review mới
 */
const createNewReview = async (
  userId: number,
  data: ReviewPayload
) => {
  ensureValidProductId(data.productId)

  // 1. Check Product exists
  const product = await productModel.findOneById(data.productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }

  // 2. Check purchased & delivered
  // User must have an order with this product and status = DELIVERED
  const hasPurchased = await checkUserPurchasedDeliveredProduct(
    userId,
    data.productId
  )

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

  // 4. Create review + recalculate rating trong cùng transaction
  let newReview
  try {
    newReview = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          ...data,
          userId
        }
      })

      const aggregate = await tx.review.aggregate({
        where: { productId: data.productId },
        _avg: {
          rating: true
        }
      })

      const newAverage = aggregate._avg.rating || 0
      const roundedRating = Math.round(newAverage * 10) / 10

      await tx.product.update({
        where: { id: data.productId },
        data: {
          rating: roundedRating
        }
      })

      return createdReview
    })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn đã đánh giá sản phẩm này rồi')
    }

    throw error
  }

  return newReview
}

/**
 * Láy reviews của sản phẩm
 */
const getProductReviews = async (productId: number) => {
  ensureValidProductId(productId)

  const product = await productModel.findOneById(productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }

  return await reviewModel.findByProductId(productId)
}

/**
 * Lấy thống kê review của sản phẩm
 */
const getProductReviewSummary = async (productId: number) => {
  ensureValidProductId(productId)

  const product = await productModel.findOneById(productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }

  const summary = await reviewModel.getProductReviewSummary(productId)

  return {
    averageRating: Math.round(summary.averageRating * 10) / 10,
    totalReviews: summary.totalReviews,
    ratingBreakdown: summary.ratingBreakdown
  }
}

/**
 * Lấy trạng thái đánh giá của user với sản phẩm
 */
const getMyReviewEligibility = async (userId: number, productId: number) => {
  ensureValidProductId(productId)

  const product = await productModel.findOneById(productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }

  const myReview = await reviewModel.findOneByUserAndProduct(userId, productId)
  if (myReview) {
    return {
      canReview: false,
      hasReviewed: true,
      reason: 'Bạn đã đánh giá sản phẩm này rồi',
      myReview
    }
  }

  const hasPurchased = await checkUserPurchasedDeliveredProduct(userId, productId)

  if (!hasPurchased) {
    return {
      canReview: false,
      hasReviewed: false,
      reason: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và đã nhận hàng thành công',
      myReview: null
    }
  }

  return {
    canReview: true,
    hasReviewed: false,
    reason: null,
    myReview: null
  }
}

export const reviewService = {
  createNewReview,
  getProductReviews,
  getProductReviewSummary,
  getMyReviewEligibility
}
