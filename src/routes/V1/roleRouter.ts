/**
 * Role Router
 * Routes for Role management (RBAC) - Admin Only
 */

import type { Router } from 'express'
import express from 'express'
import { roleController } from '~/controllers/roleController.js'
import { roleValidation } from '~/validations/roleValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const RouterInstance: Router = express.Router()

// All routes require authentication and admin role
RouterInstance.use(authMiddleware.verifyToken)
RouterInstance.use(authMiddleware.verifyAdmin)

// Role CRUD
RouterInstance.get('/', roleController.getAll)
RouterInstance.get(
  '/:id',
  roleValidation.validateRoleId,
  roleController.getById
)
RouterInstance.post('/', roleValidation.createRole, roleController.create)
RouterInstance.put('/:id', roleValidation.updateRole, roleController.update)
RouterInstance.delete(
  '/:id',
  roleValidation.validateRoleId,
  roleController.deleteById
)

// Role-Permission management
RouterInstance.get(
  '/:id/permissions',
  roleValidation.validateRoleId,
  roleController.getPermissions
)
RouterInstance.post(
  '/:id/permissions',
  roleValidation.assignPermission,
  roleController.assignPermission
)
RouterInstance.post(
  '/:id/permissions/bulk',
  roleValidation.bulkAssignPermissions,
  roleController.bulkAssignPermissions
)
RouterInstance.delete(
  '/:id/permissions/:permissionId',
  roleValidation.removePermission,
  roleController.removePermission
)

export const roleRoute = RouterInstance
