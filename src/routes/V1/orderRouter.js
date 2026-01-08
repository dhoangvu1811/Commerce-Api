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
  orderController.getDetails
)
Router.get(
  '/details-by-code/:orderCode',
  authMiddleware.verifyActiveUser,
  orderValidation.validateOrderCode,
  orderController.getDetailsByOrderCode
)
Router.post(
  '/cancel/:id',
  authMiddleware.verifyActiveUser,
  orderController.userCancel
)
Router.post(
  '/cancel-by-code/:orderCode',
  authMiddleware.verifyActiveUser,
  orderValidation.validateOrderCode,
  orderController.userCancelByOrderCode
)

// Admin routes - admin luôn active, chỉ cần verify admin
Router.get('/all', authMiddleware.verifyAdmin, orderController.adminGetOrders)
Router.get(
  '/admin/details/:id',
  authMiddleware.verifyAdmin,
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
  orderController.adminMarkPaid
)
Router.post(
  '/admin/cancel/:id',
  authMiddleware.verifyAdmin,
  orderController.adminCancel
)
Router.get(
  '/admin/logs/:id',
  authMiddleware.verifyAdmin,
  orderController.adminGetOrderLogs
)
Router.get(
  '/admin/logs-by-code/:orderCode',
  authMiddleware.verifyAdmin,
  orderValidation.validateOrderCode,
  orderController.adminGetOrderLogsByCode
)

export const orderRoute = Router
