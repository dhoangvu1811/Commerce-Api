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
const create = async (name: string): Promise<Permission> => {
  return await prisma.permission.create({
    data: { name }
  })
}

/**
 * Update permission name
 */
const update = async (id: number, name: string): Promise<Permission> => {
  return await prisma.permission.update({
    where: { id },
    data: { name }
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

export const permissionModel = {
  findAll,
  findById,
  findByName,
  create,
  update,
  countRoles,
  deleteById,
  checkUserPermission
}
