/**
 * Category Controller
 * Xử lý request/response cho category
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { categoryService } from '~/services/categoryService.js'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider.js'

/**
 * API tạo mới category
 */
const createNew = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let imageUrl = req.body.image

    // Handle image upload if file is present
    if (req.file) {
      const uploadResult = await CloudinaryProvider.streamUpload(req.file.buffer, 'categories')
      imageUrl = uploadResult.secure_url
    }

    const category = await categoryService.createNew({
      ...req.body,
      image: imageUrl
    })

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo danh mục thành công',
      data: category
    })
  } catch (error) {
    next(error)
  }
}

/**
 * API lấy danh sách category
 */
const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || Number(req.query.itemsPerPage) || 20

    const result = await categoryService.getAll(
      {
        search: req.query.search as string
      },
      page,
      limit
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách danh mục thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * API lấy chi tiết category
 */
const getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params
    const category = await categoryService.getDetail(Number(id))

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy thông tin danh mục thành công',
      data: category
    })
  } catch (error) {
    next(error)
  }
}

/**
 * API cập nhật category
 */
const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params
    let imageUrl = req.body.image

    // Handle image upload if file is present
    if (req.file) {
      const uploadResult = await CloudinaryProvider.streamUpload(req.file.buffer, 'categories')
      imageUrl = uploadResult.secure_url
    }

    const updatedCategory = await categoryService.update(Number(id), {
      ...req.body,
      image: imageUrl
    })

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật danh mục thành công',
      data: updatedCategory
    })
  } catch (error) {
    next(error)
  }
}

/**
 * API xóa category
 */
const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params
    await categoryService.deleteCategory(Number(id))

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa danh mục thành công'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * API xóa nhiều category
 */
const deleteMany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body
    const numericIds = (ids as (string | number)[]).map(id => Number(id))

    const result = await categoryService.deleteMany(numericIds)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: `Đã xóa thành công ${result.count} danh mục`,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const categoryController = {
  createNew,
  getAll,
  getDetail,
  update,
  deleteCategory,
  deleteMany
}
