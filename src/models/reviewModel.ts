/**
 * Review Model
 * Quản lý đánh giá sản phẩm
 */

import { prisma } from '~/config/prisma.js'
import type { Review } from '@prisma/client'

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
const checkUserReviewed = async (userId: number, productId: number): Promise<boolean> => {
  const count = await prisma.review.count({
    where: {
      userId,
      productId
    }
  })

  return count > 0
}

/**
 * Lấy review của user theo sản phẩm
 */
const findOneByUserAndProduct = async (userId: number, productId: number): Promise<Review | null> => {
  return await prisma.review.findFirst({
    where: {
      userId,
      productId
    }
  })
}

/**
 * Tổng hợp thống kê review của sản phẩm
 */
const getProductReviewSummary = async (productId: number) => {
  const [aggregate, groupedByRating] = await Promise.all([
    prisma.review.aggregate({
      where: { productId },
      _avg: {
        rating: true
      },
      _count: {
        _all: true
      }
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: { productId },
      _count: {
        rating: true
      }
    })
  ])

  const ratingBreakdown = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  }

  groupedByRating.forEach(item => {
    ratingBreakdown[item.rating as 1 | 2 | 3 | 4 | 5] = item._count.rating
  })

  return {
    averageRating: aggregate._avg.rating || 0,
    totalReviews: aggregate._count._all,
    ratingBreakdown
  }
}

export const reviewModel = {
  create,
  findByProductId,
  calculateAverageRating,
  checkUserReviewed,
  findOneByUserAndProduct,
  getProductReviewSummary
}
