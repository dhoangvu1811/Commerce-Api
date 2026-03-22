/**
 * Review Controller
 */

import { StatusCodes } from 'http-status-codes'
import type { Request, Response, NextFunction } from 'express'
import { reviewService } from '~/services/reviewService.js'

/**
 * Tạo review mới
 */
const createReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const productId = parseInt(req.body.productId, 10)
    const rating = parseInt(req.body.rating, 10)
    const { comment } = req.body

    const result = await reviewService.createNewReview(userId, {
      productId,
      rating,
      comment
    })

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Đánh giá sản phẩm thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy reviews của sản phẩm
 */
const getProductReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseInt(req.params.id as string, 10)
    const result = await reviewService.getProductReviews(productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách đánh giá thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thống kê review của sản phẩm
 */
const getProductReviewSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = parseInt(req.params.id as string, 10)
    const result = await reviewService.getProductReviewSummary(productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy thống kê đánh giá thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy trạng thái user có thể đánh giá sản phẩm hay không
 */
const getMyReviewEligibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const productId = parseInt(req.params.id as string, 10)
    const result = await reviewService.getMyReviewEligibility(userId, productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy trạng thái đánh giá thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const reviewController = {
  createReview,
  getProductReviews,
  getProductReviewSummary,
  getMyReviewEligibility
}
