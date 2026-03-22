/**
 * Role Service
 * Business logic for Role management (RBAC)
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { roleModel, type Role, type Permission } from '~/models/roleModel.js'
import { permissionModel } from '~/models/permissionModel.js'
import type { PaginatedRolesWithUserCountResult, RoleFilter, RoleWithPermissions } from '~/types/rbac.types.js'

/**
 * Get all roles with user count and pagination
 */
const getAll = async (page?: number, limit?: number, search?: string): Promise<PaginatedRolesWithUserCountResult> => {
  const filter: RoleFilter = { search }

  return await roleModel.findAllWithUserCount(page, limit, filter)
}

/**
 * Get role by ID with permissions
 */
const getById = async (id: number): Promise<RoleWithPermissions> => {
  const role = await roleModel.findById(id)
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy role')
  }

  return role
}

import { ROLES } from '~/constants/rbac.js'

// ...

/**
 * Create new role
 */
const create = async (name: string, displayName?: string): Promise<Role> => {
  // Check if role name already exists
  const existing = await roleModel.findByName(name)
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, `Role "${name}" đã tồn tại`)
  }

  return await roleModel.create(name, displayName)
}

/**
 * Update role
 */
const update = async (id: number, name: string, displayName?: string): Promise<Role> => {
  // Check if role exists
  const role = await roleModel.findById(id)
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy role')
  }

  // Check if new name conflicts with existing role
  const existing = await roleModel.findByName(name)
  if (existing && existing.id !== id) {
    throw new ApiError(StatusCodes.CONFLICT, `Role "${name}" đã tồn tại`)
  }

  // Prevent renaming system key of system roles if implementation allows key change.
  // Actually, usually we lock system keys.
  const systemRoles = Object.values(ROLES)
  if (systemRoles.includes(role.name as any) && name !== role.name) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Không thể đổi ID hệ thống của role mặc định')
  }

  return await roleModel.update(id, name, displayName)
}

/**
 * Delete role
 */
const deleteById = async (id: number): Promise<Role> => {
  // Check if role exists
  const role = await roleModel.findById(id)
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy role')
  }

  // Prevent deleting system roles
  const systemRoles = Object.values(ROLES) as string[]
  if (systemRoles.includes(role.name)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Không thể xóa role hệ thống')
  }

  try {
    return await roleModel.deleteById(id)
  } catch (error) {
    if (error instanceof Error && error.message.includes('user sử dụng')) {
      throw new ApiError(StatusCodes.BAD_REQUEST, error.message)
    }
    throw error
  }
}

/**
 * Get permissions for a role
 */
const getPermissions = async (roleId: number): Promise<Permission[]> => {
  const role = await roleModel.findById(roleId)
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy role')
  }

  return await roleModel.getPermissions(roleId)
}

/**
 * Assign permission to role
 */
const assignPermission = async (roleId: number, permissionId: number) => {
  // Check if role exists
  const role = await roleModel.findById(roleId)
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy role')
  }

  // Check if permission exists
  const permission = await permissionModel.findById(permissionId)
  if (!permission) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy permission')
  }

  // Check if already assigned
  const hasPermission = await roleModel.hasPermission(roleId, permission.name)
  if (hasPermission) {
    throw new ApiError(StatusCodes.CONFLICT, 'Permission đã được gán cho role này')
  }

  return await roleModel.assignPermission(roleId, permissionId)
}

/**
 * Remove permission from role
 */
const removePermission = async (roleId: number, permissionId: number) => {
  // Check if role exists
  const role = await roleModel.findById(roleId)
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy role')
  }

  // Check if permission exists
  const permission = await permissionModel.findById(permissionId)
  if (!permission) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy permission')
  }

  try {
    return await roleModel.removePermission(roleId, permissionId)
  } catch {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Permission không được gán cho role này')
  }
}

/**
 * Bulk assign permissions to role
 */
const bulkAssignPermissions = async (roleId: number, permissionIds: number[]): Promise<number> => {
  // Check if role exists
  const role = await roleModel.findById(roleId)
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy role')
  }

  // Validate all permission IDs exist
  for (const permissionId of permissionIds) {
    const permission = await permissionModel.findById(permissionId)
    if (!permission) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Permission ID ${permissionId} không tồn tại`)
    }
  }

  return await roleModel.bulkAssignPermissions(roleId, permissionIds)
}

export const roleService = {
  getAll,
  getById,
  create,
  update,
  deleteById,
  getPermissions,
  assignPermission,
  bulkAssignPermissions,
  removePermission
}
