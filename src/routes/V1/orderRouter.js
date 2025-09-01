import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { orderValidation } from '~/validations/orderValidation'
import { orderController } from '~/controllers/orderController'

const Router = express.Router()

// User
Router.use(authMiddleware.verifyToken)

Router.post('/create', orderValidation.create, orderController.create)
Router.get('/my-orders', orderController.getMyOrders)
Router.get('/details/:id', orderController.getDetails)
Router.get(
  '/details-by-code/:orderCode',
  orderValidation.validateOrderCode,
  orderController.getDetailsByOrderCode
)
Router.post('/cancel/:id', orderController.userCancel)
Router.post(
  '/cancel-by-code/:orderCode',
  orderValidation.validateOrderCode,
  orderController.userCancelByOrderCode
)

// Admin
Router.use(authMiddleware.verifyAdmin)
Router.get('/all', orderController.adminGetOrders)
Router.get('/admin/details/:id', orderController.adminGetDetails)
Router.put(
  '/admin/update/:id',
  orderValidation.updateStatus,
  orderController.adminUpdateStatus
)
Router.post('/admin/mark-paid/:id', orderController.adminMarkPaid)
Router.post('/admin/cancel/:id', orderController.adminCancel)

export const orderRoute = Router
