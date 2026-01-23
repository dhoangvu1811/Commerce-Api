/**
 * Permission Router
 * Routes for Permission management (RBAC) - Admin Only
 */

import type { Router } from 'express'
import express from 'express'
import { permissionController } from '~/controllers/permissionController.js'
import { permissionValidation } from '~/validations/permissionValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const RouterInstance: Router = express.Router()

// All routes require authentication
RouterInstance.use(authMiddleware.verifyToken)

// Get my permissions (Authenticated users)
RouterInstance.get('/me', permissionController.getMyPermissions)

// Admin only for management
RouterInstance.use(authMiddleware.verifyAdmin)

// Permission CRUD
RouterInstance.get('/', permissionController.getAll)
RouterInstance.get(
  '/:id',
  permissionValidation.validatePermissionId,
  permissionController.getById
)
RouterInstance.post(
  '/',
  permissionValidation.createPermission,
  permissionController.create
)
RouterInstance.put(
  '/:id',
  permissionValidation.updatePermission,
  permissionController.update
)
RouterInstance.delete(
  '/:id',
  permissionValidation.validatePermissionId,
  permissionController.deleteById
)

export const permissionRoute = RouterInstance
