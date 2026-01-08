import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { orderValidation } from '~/validations/orderValidation'
import { orderController } from '~/controllers/orderController'

const Router = express.Router()

// All routes require authentication
Router.use(authMiddleware.verifyToken)

// User routes - yêu cầu user phải active
Router.post(
  '/create',
  authMiddleware.verifyActiveUser,
  orderValidation.create,
  orderController.create
)
Router.get(
  '/my-orders',
  authMiddleware.verifyActiveUser,
  orderController.getMyOrders
)
Router.get(
  '/details/:id',
  authMiddleware.verifyActiveUser,
  orderValidation.validateOrderId,
  orderController.getDetails
)
Router.post(
  '/cancel/:id',
  authMiddleware.verifyActiveUser,
  orderValidation.validateOrderId,
  orderController.userCancel
)

// Admin routes - admin luôn active, chỉ cần verify admin
Router.get('/all', authMiddleware.verifyAdmin, orderController.adminGetOrders)
Router.get(
  '/admin/details/:id',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderId,
  orderController.adminGetDetails
)
Router.put(
  '/admin/update/:id',
  authMiddleware.verifyAdmin,
  orderValidation.updateStatus,
  orderController.adminUpdateStatus
)
Router.put(
  '/admin/update-payment/:id',
  authMiddleware.verifyAdmin,
  orderValidation.updatePaymentStatus,
  orderController.adminUpdatePaymentStatus
)
Router.post(
  '/admin/mark-paid/:id',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderId,
  orderController.adminMarkPaid
)
Router.post(
  '/admin/cancel/:id',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderId,
  orderController.adminCancel
)
Router.get(
  '/admin/logs/:id',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderId,
  orderController.adminGetOrderLogs
)

export const orderRoute = Router
