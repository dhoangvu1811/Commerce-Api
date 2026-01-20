/**
 * Review Model
 * Quản lý đánh giá sản phẩm
 */

import { prisma } from '~/config/prisma.js'
import type { Review } from '~/generated/prisma/index.js'

/**
 * Tạo mới review
 */
const create = async (data: {
  userId: number
  productId: number
  rating: number
  comment?: string
}): Promise<Review> => {
  return await prisma.review.create({
    data
  })
}

/**
 * Lấy danh sách review theo sản phẩm (public)
 */
const findByProductId = async (productId: number) => {
  return await prisma.review.findMany({
    where: { productId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Tính điểm đánh giá trung bình
 */
const calculateAverageRating = async (productId: number): Promise<number> => {
  const aggregate = await prisma.review.aggregate({
    where: { productId },
    _avg: {
      rating: true
    }
  })
  return aggregate._avg.rating || 0
}

/**
 * Check if user reviewed product
 */
const checkUserReviewed = async (
  userId: number,
  productId: number
): Promise<boolean> => {
  const count = await prisma.review.count({
    where: {
      userId,
      productId
    }
  })
  return count > 0
}

export const reviewModel = {
  create,
  findByProductId,
  calculateAverageRating,
  checkUserReviewed
}
