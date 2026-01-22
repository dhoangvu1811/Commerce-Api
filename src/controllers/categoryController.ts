/**
 * Category Controller
 * Xử lý request/response cho category
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { categoryService } from '~/services/categoryService.js'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider.js'

/**
 * API tạo mới category
 */
const createNew = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let imageUrl = req.body.image

    // Handle image upload if file is present
    if (req.file) {
      const uploadResult = await CloudinaryProvider.streamUpload(
        req.file.buffer,
        'categories'
      )
      imageUrl = uploadResult.secure_url
    }

    const category = await categoryService.createNew({
      ...req.body,
      image: imageUrl
    })

    res.status(StatusCodes.CREATED).json(category)
  } catch (error) {
    next(error)
  }
}

/**
 * API lấy danh sách category
 */
const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await categoryService.getAll({
      search: req.query.search as string
    })

    res.status(StatusCodes.OK).json(categories)
  } catch (error) {
    next(error)
  }
}

/**
 * API lấy chi tiết category
 */
const getDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const category = await categoryService.getDetail(Number(id))

    res.status(StatusCodes.OK).json(category)
  } catch (error) {
    next(error)
  }
}

/**
 * API cập nhật category
 */
const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    let imageUrl = req.body.image

    // Handle image upload if file is present
    if (req.file) {
      const uploadResult = await CloudinaryProvider.streamUpload(
        req.file.buffer,
        'categories'
      )
      imageUrl = uploadResult.secure_url
    }

    const updatedCategory = await categoryService.update(Number(id), {
      ...req.body,
      image: imageUrl
    })

    res.status(StatusCodes.OK).json(updatedCategory)
  } catch (error) {
    next(error)
  }
}

/**
 * API xóa category
 */
const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    await categoryService.deleteCategory(Number(id))

    res.status(StatusCodes.OK).json({
      message: 'Xóa danh mục thành công'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * API xóa nhiều category
 */
const deleteMany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ids } = req.body
    const numericIds = (ids as (string | number)[]).map((id) => Number(id))

    const result = await categoryService.deleteMany(numericIds)

    res.status(StatusCodes.OK).json({
      message: `Đã xóa thành công ${result.count} danh mục`
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
