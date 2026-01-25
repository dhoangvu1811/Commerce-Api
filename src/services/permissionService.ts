/**
 * Permission Service
 * Business logic for Permission management (RBAC)
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { permissionModel, type Permission } from '~/models/permissionModel.js'
import {
  PaginatedPermissionsResult,
  PermissionFilter
} from '~/types/rbac.types.js'

/**
 * Get all permissions with pagination
 */
const getAll = async (
  page?: number,
  limit?: number,
  search?: string
): Promise<PaginatedPermissionsResult> => {
  const filter: PermissionFilter = { search }
  return await permissionModel.findAll(page, limit, filter)
}

/**
 * Get permission by ID
 */
const getById = async (id: number): Promise<Permission> => {
  const permission = await permissionModel.findById(id)
  if (!permission) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy permission')
  }
  return permission
}

import { PERMISSIONS } from '~/constants/rbac.js'

// ...

/**
 * Create new permission
 */
const create = async (
  name: string,
  displayName?: string
): Promise<Permission> => {
  // Check if permission name already exists
  const existing = await permissionModel.findByName(name)
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, `Permission "${name}" đã tồn tại`)
  }
  return await permissionModel.create(name, displayName)
}

/**
 * Update permission
 */
const update = async (
  id: number,
  name: string,
  displayName?: string
): Promise<Permission> => {
  // Check if permission exists
  const permission = await permissionModel.findById(id)
  if (!permission) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy permission')
  }

  // Check if new name conflicts with existing permission
  const existing = await permissionModel.findByName(name)
  if (existing && existing.id !== id) {
    throw new ApiError(StatusCodes.CONFLICT, `Permission "${name}" đã tồn tại`)
  }

  // Prevent renaming system permissions if necessary
  const systemPermissions = Object.values(PERMISSIONS)
  if (
    systemPermissions.includes(permission.name as any) &&
    permission.name !== name
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Không thể đổi System Key của permission mặc định'
    )
  }

  return await permissionModel.update(id, name, displayName)
}

/**
 * Delete permission
 */
const deleteById = async (id: number): Promise<Permission> => {
  // Check if permission exists
  const permission = await permissionModel.findById(id)
  if (!permission) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy permission')
  }

  // Prevent deleting system permissions
  const systemPermissions = Object.values(PERMISSIONS) as string[]
  if (systemPermissions.includes(permission.name)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Không thể xóa permission mặc định của hệ thống'
    )
  }

  try {
    return await permissionModel.deleteById(id)
  } catch (error) {
    if (error instanceof Error && error.message.includes('role')) {
      throw new ApiError(StatusCodes.BAD_REQUEST, error.message)
    }
    throw error
  }
}

/**
 * Get permissions by user ID
 */
const getByUserId = async (userId: number): Promise<Permission[]> => {
  return await permissionModel.findByUserId(userId)
}

export const permissionService = {
  getAll,
  getById,
  create,
  update,
  deleteById,
  getByUserId
}
