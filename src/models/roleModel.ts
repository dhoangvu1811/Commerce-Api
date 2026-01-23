/**
 * Role Model
 * CRUD operations for Role management (RBAC)
 */

import { prisma } from '~/config/prisma.js'
import type {
  Role,
  Permission,
  RolePermission
} from '~/generated/prisma/index.js'

export type { Role, Permission }

/** Role with permissions type */
export type RoleWithPermissions = Role & {
  rolePermissions: (RolePermission & { permission: Permission })[]
}

/**
 * Find all roles
 */
const findAll = async (): Promise<Role[]> => {
  return await prisma.role.findMany({
    orderBy: { id: 'asc' }
  })
}

/** Role with user count type */
export type RoleWithUserCount = Role & {
  _count: { users: number }
}

/**
 * Find all roles with user count
 */
const findAllWithUserCount = async (): Promise<RoleWithUserCount[]> => {
  return await prisma.role.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: { users: true }
      }
    }
  })
}

/**
 * Find role by ID with permissions
 */
const findById = async (id: number): Promise<RoleWithPermissions | null> => {
  return await prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  })
}

/**
 * Find role by name
 */
const findByName = async (name: string): Promise<Role | null> => {
  return await prisma.role.findUnique({
    where: { name }
  })
}

/**
 * Create new role
 */
/**
 * Create new role
 */
const create = async (name: string, displayName?: string): Promise<Role> => {
  return await prisma.role.create({
    data: { name, displayName }
  })
}

/**
 * Update role
 */
const update = async (
  id: number,
  name: string,
  displayName?: string
): Promise<Role> => {
  return await prisma.role.update({
    where: { id },
    data: { name, displayName }
  })
}

/**
 * Count users with this role
 */
const countUsers = async (roleId: number): Promise<number> => {
  return await prisma.user.count({
    where: { roleId }
  })
}

/**
 * Delete role (throws error if role has users)
 */
const deleteById = async (id: number): Promise<Role> => {
  // Safety check: prevent deleting role with users
  const userCount = await countUsers(id)
  if (userCount > 0) {
    throw new Error(`Không thể xóa role đang được ${userCount} user sử dụng`)
  }
  return await prisma.role.delete({
    where: { id }
  })
}

/**
 * Assign permission to role
 */
const assignPermission = async (
  roleId: number,
  permissionId: number
): Promise<RolePermission> => {
  return await prisma.rolePermission.create({
    data: { roleId, permissionId }
  })
}

/**
 * Bulk assign permissions to role
 */
const bulkAssignPermissions = async (
  roleId: number,
  permissionIds: number[]
): Promise<number> => {
  const result = await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    skipDuplicates: true
  })
  return result.count
}

/**
 * Remove permission from role
 */
const removePermission = async (
  roleId: number,
  permissionId: number
): Promise<RolePermission> => {
  return await prisma.rolePermission.delete({
    where: {
      roleId_permissionId: { roleId, permissionId }
    }
  })
}

/**
 * Get permissions for a role
 */
const getPermissions = async (roleId: number): Promise<Permission[]> => {
  const roleWithPermissions = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  })

  return roleWithPermissions?.rolePermissions.map((rp) => rp.permission) || []
}

/**
 * Check if role has permission
 */
const hasPermission = async (
  roleId: number,
  permissionName: string
): Promise<boolean> => {
  const count = await prisma.rolePermission.count({
    where: {
      roleId,
      permission: {
        name: permissionName
      }
    }
  })
  return count > 0
}

export const roleModel = {
  findAll,
  findAllWithUserCount,
  findById,
  findByName,
  create,
  update,
  countUsers,
  deleteById,
  assignPermission,
  bulkAssignPermissions,
  removePermission,
  getPermissions,
  hasPermission
}
