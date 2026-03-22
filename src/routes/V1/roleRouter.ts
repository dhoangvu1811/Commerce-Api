/**
 * Role Router
 * Routes for Role management (RBAC) - Admin Only
 */

import type { Router } from 'express'
import express from 'express'
import { roleController } from '~/controllers/roleController.js'
import { roleValidation } from '~/validations/roleValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

import { PERMISSIONS } from '~/constants/rbac.js'

const RouterInstance: Router = express.Router()

// All routes require authentication
RouterInstance.use(authMiddleware.verifyToken)

// Role CRUD
// Get all roles: Allowed for users who can manage roles OR manage users (for dropdowns)
RouterInstance.get(
  '/',
  authMiddleware.requireAnyPermission([PERMISSIONS.MANAGE_ROLES, PERMISSIONS.MANAGE_USERS]),
  roleController.getAll
)

// Read single role: Same logic
RouterInstance.get(
  '/:id',
  authMiddleware.requireAnyPermission([PERMISSIONS.MANAGE_ROLES, PERMISSIONS.MANAGE_USERS]),
  roleValidation.validateRoleId,
  roleController.getById
)

// Write operations: Strict manage_roles permission
RouterInstance.post(
  '/',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  roleValidation.createRole,
  roleController.create
)
RouterInstance.put(
  '/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  roleValidation.updateRole,
  roleController.update
)
RouterInstance.delete(
  '/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  roleValidation.validateRoleId,
  roleController.deleteById
)

// Role-Permission management: Strict manage_roles permission
RouterInstance.get(
  '/:id/permissions',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  roleValidation.validateRoleId,
  roleController.getPermissions
)
RouterInstance.post(
  '/:id/permissions',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  roleValidation.assignPermission,
  roleController.assignPermission
)
RouterInstance.post(
  '/:id/permissions/bulk',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  roleValidation.bulkAssignPermissions,
  roleController.bulkAssignPermissions
)
RouterInstance.delete(
  '/:id/permissions/:permissionId',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_ROLES),
  roleValidation.removePermission,
  roleController.removePermission
)

export const roleRoute = RouterInstance
