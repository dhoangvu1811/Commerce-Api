/**
 * Order Router
 * Định nghĩa các routes cho orders
 */

import type { Router } from 'express'
import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { orderValidation } from '~/validations/orderValidation.js'
import { orderController } from '~/controllers/orderController.js'
import { PERMISSIONS } from '~/constants/rbac.js'

const RouterInstance: Router = express.Router()

// All routes require authentication
RouterInstance.use(authMiddleware.verifyToken)

// User routes - yêu cầu user phải active
RouterInstance.post('/create', authMiddleware.verifyActiveUser, orderValidation.create, orderController.create)
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

// Admin routes - requires manage_orders permission
RouterInstance.get('/all', authMiddleware.requirePermission(PERMISSIONS.MANAGE_ORDERS), orderController.adminGetOrders)
RouterInstance.get(
  '/dashboard-summary',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ORDERS),
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_PRODUCTS),
  orderController.adminGetDashboardSummary
)
RouterInstance.get(
  '/admin/details/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ORDERS),
  orderValidation.validateOrderId,
  orderController.adminGetDetails
)
RouterInstance.put(
  '/admin/update/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ORDERS),
  orderValidation.updateStatus,
  orderController.adminUpdateStatus
)
RouterInstance.put(
  '/admin/update-payment/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ORDERS),
  orderValidation.updatePaymentStatus,
  orderController.adminUpdatePaymentStatus
)
RouterInstance.post(
  '/admin/mark-paid/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ORDERS),
  orderValidation.validateOrderId,
  orderController.adminMarkPaid
)
RouterInstance.post(
  '/admin/cancel/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ORDERS),
  orderValidation.validateOrderId,
  orderController.adminCancel
)
RouterInstance.get(
  '/admin/logs/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ORDERS),
  orderValidation.validateOrderId,
  orderController.adminGetOrderLogs
)

export const orderRoute = RouterInstance
