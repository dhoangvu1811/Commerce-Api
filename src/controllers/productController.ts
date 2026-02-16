
/**
 * Product Controller
 * Điều phối API requests cho products
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { productService } from '~/services/productService.js'

// Extend Request type to include file from multer
interface MulterRequest extends Request {
  file?: Express.Multer.File
}

const createNew = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const createProduct = await productService.createNew(req.body)

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo sản phẩm thành công',
      data: createProduct
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const productId = String(req.params.id)

    const product = await productService.getDetails(productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết sản phẩm thành công',
      data: product
    })
  } catch (error) {
    next(error)
  }
}

const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const productId = String(req.params.id)

    const updatedProduct = await productService.update(productId, req.body)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật sản phẩm thành công',
      data: updatedProduct
    })
  } catch (error) {
    next(error)
  }
}

const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const productId = String(req.params.id)

    const result = await productService.deleteProduct(productId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa sản phẩm thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteSelectedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productIds } = req.body || {}

    const result = await productService.deleteSelectedProducts(productIds)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa các sản phẩm được chọn thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, itemsPerPage, search, categoryId, sort, minPrice, maxPrice } =
      req.query || {}
    const queryFilter = {
      search: search as string | undefined,
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
      sort: sort as string | undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined
    }

    const result = await productService.getProducts(
      page ? parseInt(page as string) : 1,
      itemsPerPage ? parseInt(itemsPerPage as string) : 10,
      queryFilter
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách sản phẩm thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const uploadImage = async (
  req: MulterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Kiểm tra xem có file được upload không
    if (!req.file) {
      res.status(StatusCodes.BAD_REQUEST).json({
        code: StatusCodes.BAD_REQUEST,
        message: 'Vui lòng chọn ảnh để upload',
        data: null
      })

      return
    }

    // Upload ảnh lên Cloudinary thông qua service
    const uploadResult = await productService.uploadImage(
      req.file?.buffer,
      'products'
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Upload ảnh thành công',
      data: {
        imageUrl: uploadResult?.secure_url,
        publicId: uploadResult?.public_id
      }
    })
  } catch (error) {
    next(error)
  }
}

export const productController = {
  createNew,
  getDetails,
  update,
  deleteProduct,
  deleteSelectedProducts,
  getProducts,
  uploadImage
}
