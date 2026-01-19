/**
 * Role Controller
 * HTTP handlers for Role management (RBAC)
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { roleService } from '~/services/roleService.js'

/**
 * Get all roles
 */
const getAll = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await roleService.getAll()
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      data: roles
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get role by ID with permissions
 */
const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    const role = await roleService.getById(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      data: role
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new role
 */
const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body
    const role = await roleService.create(name)
    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo role thành công',
      data: role
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update role
 */
const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    const { name } = req.body
    const role = await roleService.update(id, name)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật role thành công',
      data: role
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete role
 */
const deleteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    await roleService.deleteById(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa role thành công'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get permissions for a role
 */
const getPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    const permissions = await roleService.getPermissions(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      data: permissions
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Assign permission to role
 */
const assignPermission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const roleId = parseInt(req.params.id as string, 10)
    const { permissionId } = req.body
    await roleService.assignPermission(roleId, permissionId)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Gán permission thành công'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Remove permission from role
 */
const removePermission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const roleId = parseInt(req.params.id as string, 10)
    const permissionId = parseInt(req.params.permissionId as string, 10)
    await roleService.removePermission(roleId, permissionId)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Gỡ permission thành công'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Bulk assign permissions to role
 */
const bulkAssignPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const roleId = parseInt(req.params.id as string, 10)
    const { permissionIds } = req.body
    const count = await roleService.bulkAssignPermissions(roleId, permissionIds)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: `Đã gán ${count} permission thành công`,
      data: { assignedCount: count }
    })
  } catch (error) {
    next(error)
  }
}

export const roleController = {
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
