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

import type {
  PaginatedRolesResult,
  RoleFilter,
  RoleWithPermissions,
  PaginatedRolesWithUserCountResult
} from '~/types/rbac.types.js'

export type { Role, Permission }

/**
 * Find all roles with pagination
 */
const findAll = async (
  page: number = 1,
  limit: number = 10,
  filter?: RoleFilter
): Promise<PaginatedRolesResult> => {
  const skip = (page - 1) * limit
  const where = filter?.search
    ? {
      OR: [
        { name: { contains: filter.search, mode: 'insensitive' as const } },
        {
          displayName: {
            contains: filter.search,
            mode: 'insensitive' as const
          }
        }
      ]
    }
    : {}

  const [roles, totalItems] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: 'asc' }
    }),
    prisma.role.count({ where })
  ])

  const totalPages = Math.ceil(totalItems / limit)

  return {
    roles,
    pagination: {
      page,
      itemsPerPage: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Find all roles with user count and pagination
 */
const findAllWithUserCount = async (
  page: number = 1,
  limit: number = 10,
  filter?: RoleFilter
): Promise<PaginatedRolesWithUserCountResult> => {
  const skip = (page - 1) * limit
  const where = filter?.search
    ? {
      OR: [
        { name: { contains: filter.search, mode: 'insensitive' as const } },
        {
          displayName: {
            contains: filter.search,
            mode: 'insensitive' as const
          }
        }
      ]
    }
    : {}

  const [roles, totalItems] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    }),
    prisma.role.count({ where })
  ])

  const totalPages = Math.ceil(totalItems / limit)

  return {
    roles,
    pagination: {
      page,
      itemsPerPage: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
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
