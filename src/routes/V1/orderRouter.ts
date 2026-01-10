/**
 * Order Router
 * Định nghĩa các routes cho orders
 */

import express, { Router } from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { orderValidation } from '~/validations/orderValidation.js'
import { orderController } from '~/controllers/orderController.js'

const RouterInstance: Router = express.Router()

// All routes require authentication
RouterInstance.use(authMiddleware.verifyToken)

// User routes - yêu cầu user phải active
RouterInstance.post(
  '/create',
  authMiddleware.verifyActiveUser,
  orderValidation.create,
  orderController.create
)
RouterInstance.get('/my-orders', authMiddleware.verifyActiveUser, orderController.getMyOrders)
RouterInstance.get(
  '/details/:id',
  authMiddleware.verifyActiveUser,
  orderValidation.validateOrderId,
  orderController.getDetails
)
RouterInstance.post(
  '/cancel/:id',
  authMiddleware.verifyActiveUser,
  orderValidation.validateOrderId,
  orderController.userCancel
)

// Admin routes - admin luôn active, chỉ cần verify admin
RouterInstance.get('/all', authMiddleware.verifyAdmin, orderController.adminGetOrders)
RouterInstance.get(
  '/admin/details/:id',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderId,
  orderController.adminGetDetails
)
RouterInstance.put(
  '/admin/update/:id',
  authMiddleware.verifyAdmin,
  orderValidation.updateStatus,
  orderController.adminUpdateStatus
)
RouterInstance.put(
  '/admin/update-payment/:id',
  authMiddleware.verifyAdmin,
  orderValidation.updatePaymentStatus,
  orderController.adminUpdatePaymentStatus
)
RouterInstance.post(
  '/admin/mark-paid/:id',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderId,
  orderController.adminMarkPaid
)
RouterInstance.post(
  '/admin/cancel/:id',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderId,
  orderController.adminCancel
)
RouterInstance.get(
  '/admin/logs/:id',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderId,
  orderController.adminGetOrderLogs
)

export const orderRoute = RouterInstance
