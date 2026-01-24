/**
 * Permission Router
 * Routes for Permission management (RBAC) - Admin Only
 */

import type { Router } from 'express'
import express from 'express'
import { permissionController } from '~/controllers/permissionController.js'
import { permissionValidation } from '~/validations/permissionValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

import { PERMISSIONS } from '~/constants/rbac.js'

const RouterInstance: Router = express.Router()

// All routes require authentication
RouterInstance.use(authMiddleware.verifyToken)

// Get my permissions (Authenticated users)
RouterInstance.get('/me', permissionController.getMyPermissions)

// Permission CRUD - Protected by Permission
RouterInstance.get(
  '/',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  permissionController.getAll
)
RouterInstance.get(
  '/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  permissionValidation.validatePermissionId,
  permissionController.getById
)
RouterInstance.post(
  '/',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  permissionValidation.createPermission,
  permissionController.create
)
RouterInstance.put(
  '/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  permissionValidation.updatePermission,
  permissionController.update
)
RouterInstance.delete(
  '/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  permissionValidation.validatePermissionId,
  permissionController.deleteById
)

export const permissionRoute = RouterInstance
