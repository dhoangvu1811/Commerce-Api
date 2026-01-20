/**
 * Permission Service
 * Business logic for Permission management (RBAC)
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { permissionModel, type Permission } from '~/models/permissionModel.js'

/**
 * Get all permissions
 */
const getAll = async (): Promise<Permission[]> => {
  return await permissionModel.findAll()
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

/**
 * Create new permission
 */
const create = async (name: string): Promise<Permission> => {
  // Check if permission name already exists
  const existing = await permissionModel.findByName(name)
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, `Permission "${name}" đã tồn tại`)
  }
  return await permissionModel.create(name)
}

/**
 * Update permission name
 */
const update = async (id: number, name: string): Promise<Permission> => {
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

  return await permissionModel.update(id, name)
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

  try {
    return await permissionModel.deleteById(id)
  } catch (error) {
    if (error instanceof Error && error.message.includes('role')) {
      throw new ApiError(StatusCodes.BAD_REQUEST, error.message)
    }
    throw error
  }
}

export const permissionService = {
  getAll,
  getById,
  create,
  update,
  deleteById
}
