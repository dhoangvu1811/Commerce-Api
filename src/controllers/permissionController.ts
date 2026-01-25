/**
 * Permission Controller
 * HTTP handlers for Permission management (RBAC)
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { permissionService } from '~/services/permissionService.js'

/**
 * Get all permissions
 */
const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = req.query.search as string

    const result = await permissionService.getAll(page, limit, search)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách permission thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get permission by ID
 */
const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    const permission = await permissionService.getById(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết permission thành công',
      data: permission
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new permission
 */
const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, displayName } = req.body
    const permission = await permissionService.create(name, displayName)
    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo permission thành công',
      data: permission
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update permission
 */
const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    const { name, displayName } = req.body
    const permission = await permissionService.update(id, name, displayName)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật permission thành công',
      data: permission
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete permission
 */
const deleteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    await permissionService.deleteById(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa permission thành công'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get permissions of current user
 */
const getMyPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = parseInt(req.jwtDecoded?._id as string, 10)
    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Không xác định được user')
    }

    const permissions = await permissionService.getByUserId(userId)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách permission của bạn thành công',
      data: permissions
    })
  } catch (error) {
    next(error)
  }
}

export const permissionController = {
  getAll,
  getById,
  create,
  update,
  deleteById,
  getMyPermissions
}
