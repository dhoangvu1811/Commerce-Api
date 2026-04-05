/**
 * Payment Router
 * Định nghĩa các route thanh toán.
 */

import type { Router } from 'express'
import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { paymentValidation } from '~/validations/paymentValidation.js'
import { paymentController } from '~/controllers/paymentController.js'

const RouterInstance: Router = express.Router()

// Tất cả route payment user yêu cầu xác thực
RouterInstance.use(authMiddleware.verifyToken)

RouterInstance.post(
  '/paypal/create-order',
  authMiddleware.verifyActiveUser,
  paymentValidation.paypalCreateOrder,
  paymentController.paypalCreateOrder
)

RouterInstance.post(
  '/paypal/capture-order',
  authMiddleware.verifyActiveUser,
  paymentValidation.paypalCaptureOrder,
  paymentController.paypalCaptureOrder
)

export const paymentRouter = RouterInstance
