/**
 * Permission Model
 * CRUD operations for Permission management (RBAC)
 */

import { prisma } from '~/config/prisma.js'
import type { Permission } from '~/generated/prisma/index.js'

export type { Permission }

/**
 * Find all permissions
 */
const findAll = async (): Promise<Permission[]> => {
  return await prisma.permission.findMany({
    orderBy: { name: 'asc' }
  })
}

/**
 * Find permission by ID
 */
const findById = async (id: number): Promise<Permission | null> => {
  return await prisma.permission.findUnique({
    where: { id }
  })
}

/**
 * Find permission by name
 */
const findByName = async (name: string): Promise<Permission | null> => {
  return await prisma.permission.findUnique({
    where: { name }
  })
}

/**
 * Create new permission
 */
const create = async (
  name: string,
  displayName?: string
): Promise<Permission> => {
  return await prisma.permission.create({
    data: { name, displayName }
  })
}

/**
 * Update permission name
 */
const update = async (
  id: number,
  name: string,
  displayName?: string
): Promise<Permission> => {
  return await prisma.permission.update({
    where: { id },
    data: { name, displayName }
  })
}

/**
 * Count roles using this permission
 */
const countRoles = async (permissionId: number): Promise<number> => {
  return await prisma.rolePermission.count({
    where: { permissionId }
  })
}

/**
 * Delete permission (throws error if permission is assigned to roles)
 */
const deleteById = async (id: number): Promise<Permission> => {
  // Safety check: prevent deleting permission assigned to roles
  const roleCount = await countRoles(id)
  if (roleCount > 0) {
    throw new Error(
      `Không thể xóa permission đang được gán cho ${roleCount} role`
    )
  }
  return await prisma.permission.delete({
    where: { id }
  })
}

/**
 * Check if user has permission (via their role)
 */
const checkUserPermission = async (
  userId: number,
  permissionName: string
): Promise<boolean> => {
  const count = await prisma.rolePermission.count({
    where: {
      permission: { name: permissionName },
      role: {
        users: {
          some: { id: userId }
        }
      }
    }
  })
  return count > 0
}

/**
 * Check if user has ANY of the specified permissions (optimized - single query)
 */
const checkUserAnyPermission = async (
  userId: number,
  permissionNames: string[]
): Promise<boolean> => {
  const count = await prisma.rolePermission.count({
    where: {
      permission: { name: { in: permissionNames } },
      role: {
        users: {
          some: { id: userId }
        }
      }
    }
  })
  return count > 0
}

/**
 * Check if user has ALL of the specified permissions
 */
const checkUserAllPermissions = async (
  userId: number,
  permissionNames: string[]
): Promise<boolean> => {
  // Count how many of the required permissions the user has
  const userPermissions = await prisma.rolePermission.findMany({
    where: {
      permission: { name: { in: permissionNames } },
      role: {
        users: {
          some: { id: userId }
        }
      }
    },
    select: {
      permission: { select: { name: true } }
    },
    distinct: ['permissionId']
  })

  // Check if user has all required permissions
  const userPermissionNames = userPermissions.map((p) => p.permission.name)
  return permissionNames.every((name) => userPermissionNames.includes(name))
}

/**
 * Get all permissions of a user
 */
const findByUserId = async (userId: number): Promise<Permission[]> => {
  // Find permissions via Role
  // 1. Get user's role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roleId: true }
  })

  if (!user || !user.roleId) return []

  // 2. Get permissions of that role
  const roleWithPermissions = await prisma.role.findUnique({
    where: { id: user.roleId },
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

export const permissionModel = {
  findAll,
  findById,
  findByName,
  create,
  update,
  countRoles,
  deleteById,
  checkUserPermission,
  checkUserAnyPermission,
  checkUserAllPermissions,
  findByUserId
}
