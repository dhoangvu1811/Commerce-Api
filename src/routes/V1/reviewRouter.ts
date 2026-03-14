/**
 * Review Routes
 */

import type { Router } from 'express'
import express from 'express'
import { reviewController } from '~/controllers/reviewController.js'
import { reviewValidation } from '~/validations/reviewValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const router: Router = express.Router()

// Public: Xem đánh giá của sản phẩm
router.get('/products/:id', reviewController.getProductReviews)

// Public: Xem thống kê đánh giá của sản phẩm
router.get('/products/:id/summary', reviewController.getProductReviewSummary)

// Protected: Trạng thái user có thể đánh giá sản phẩm hay không
router.get(
  '/products/:id/me',
  authMiddleware.verifyToken,
  reviewController.getMyReviewEligibility
)

// Protected: Tạo đánh giá
router.post(
  '/',
  authMiddleware.verifyToken,
  reviewValidation.createReview,
  reviewController.createReview
)

export const reviewRouter = router
