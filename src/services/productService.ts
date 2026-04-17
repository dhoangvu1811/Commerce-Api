/* eslint-disable indent */
/**
 * Product Service - Prisma Version
 * Xử lý logic business cho product
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import {
  productModel,
  type Product,
  type ProductFilter,
  type CreateProductInput,
  type UpdateProductInput
} from '~/models/productModel.js'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider.js'
import { prisma } from '~/config/prisma.js'
import type { ProductQueryFilter } from '~/types/product.types.js'
import { slugify } from '~/utils/helper.js'
import type { PaginationInfo, UploadResult, DeleteResultInfo } from '~/types/common.types.js'
import { requestReindex } from '~/services/recommenderIndexService.js'

/** Paginated products result */
interface PaginatedProductsResult {
  products: Product[]
  pagination: PaginationInfo
}

/**
 * Parse productId string to number
 */
const parseProductId = (productId: string): number => {
  const id = parseInt(productId, 10)
  if (isNaN(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'ID sản phẩm không hợp lệ')
  }

  return id
}

/**
 * Tạo product mới
 */
const createNew = async (
  productData: Omit<CreateProductInput, 'slug'> & {
    images?: string[]
  }
): Promise<Product> => {
  try {
    // Kiểm tra sản phẩm đã tồn tại chưa (theo tên và category)
    const existingProduct = await productModel.findByNameAndCategory(productData.name, productData.categoryId)

    if (existingProduct) {
      // Get category name for error message
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId }
      })
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Sản phẩm "${productData.name}" thuộc danh mục "${category?.name || productData.categoryId}" đã tồn tại`
      )
    }

    // Generate slug
    const slug = slugify(productData.name) + '-' + Date.now()

    // Extract images array before creating product
    const { images, ...productDataWithoutImages } = productData

    // Tạo sản phẩm mới
    const createdProduct = await productModel.createNew({
      ...productDataWithoutImages,
      slug
    })

    // Thêm gallery images nếu có
    if (images && images.length > 0) {
      await productModel.addImages(createdProduct.id, images)
    }

    // Lấy lại product với images đã được thêm
    const productWithImages = await productModel.findOneById(createdProduct.id)

    requestReindex()

    return productWithImages || createdProduct
  } catch (error) {
    throw error
  }
}

/**
 * Lấy chi tiết product
 */
const getDetails = async (productId: string): Promise<Product> => {
  try {
    const productIdNum = parseProductId(productId)
    const product = await productModel.findOneById(productIdNum)

    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
    }

    return product
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật product
 */
const update = async (productId: string, updateData: UpdateProductInput & { images?: string[] }): Promise<Product> => {
  try {
    const productIdNum = parseProductId(productId)

    // Kiểm tra sản phẩm có tồn tại không
    const existingProduct = await productModel.findOneById(productIdNum)
    if (!existingProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
    }

    // Kiểm tra duplicate nếu có thay đổi name hoặc categoryId
    if (updateData.name || updateData.categoryId) {
      const nameToCheck = updateData.name || existingProduct.name
      const categoryToCheck = updateData.categoryId || existingProduct.categoryId

      const duplicateProduct = await productModel.findByNameAndCategory(nameToCheck, categoryToCheck)

      // Nếu tìm thấy sản phẩm trùng và không phải là chính sản phẩm đang update
      if (duplicateProduct && duplicateProduct.id !== productIdNum) {
        const category = await prisma.category.findUnique({
          where: { id: categoryToCheck }
        })
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Sản phẩm "${nameToCheck}" thuộc danh mục "${category?.name}" đã tồn tại`
        )
      }
    }

    // Extract images from updateData
    const { images, ...dataWithoutImages } = updateData

    // Update slug if name changed
    const dataToUpdate = { ...dataWithoutImages }
    if (updateData.name) {
      ;(dataToUpdate as { slug?: string }).slug = slugify(updateData.name) + '-' + Date.now()
    }

    const updatedProduct = await productModel.update(productIdNum, dataToUpdate)

    if (!updatedProduct) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không thể cập nhật sản phẩm')
    }

    // Sync gallery images nếu có trong request
    if (images !== undefined) {
      await productModel.syncImages(productIdNum, images)
    }

    // Lấy lại product với images đã được cập nhật
    const productWithImages = await productModel.findOneById(productIdNum)

    requestReindex()

    return productWithImages || updatedProduct
  } catch (error) {
    throw error
  }
}

/**
 * Xóa product
 */
const deleteProduct = async (productId: string): Promise<DeleteResultInfo> => {
  try {
    const productIdNum = parseProductId(productId)

    // Kiểm tra sản phẩm có tồn tại không
    const existingProduct = await productModel.findOneById(productIdNum)
    if (!existingProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
    }

    // Xóa sản phẩm
    const result = await productModel.deleteOneById(productIdNum)

    requestReindex()

    return {
      deletedCount: result ? 1 : 0,
      message: 'Đã xóa sản phẩm thành công'
    }
  } catch (error) {
    throw error
  }
}

/**
 * Xóa nhiều products
 */
const deleteSelectedProducts = async (productIds: string[]): Promise<DeleteResultInfo> => {
  try {
    // Validate input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Danh sách ID sản phẩm không hợp lệ')
    }

    // Parse all IDs
    const numberIds = productIds.map(id => {
      const num = parseInt(id, 10)
      if (isNaN(num)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `ID sản phẩm không hợp lệ: ${id}`)
      }

      return num
    })

    // Kiểm tra các sản phẩm có tồn tại không
    const existingProducts = await productModel.findByIds(numberIds)
    const existingIds = existingProducts.map(product => product.id)
    const notFoundIds = numberIds.filter(id => !existingIds.includes(id))

    if (notFoundIds.length > 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy sản phẩm với ID: ${notFoundIds.join(', ')}`)
    }

    // Xóa các sản phẩm đã chọn
    const result = await productModel.deleteMany({ id: { in: numberIds } })

    requestReindex()

    return {
      deletedCount: result.count,
      message: `Đã xóa ${result.count} sản phẩm được chọn`,
      deletedIds: productIds
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy danh sách products với phân trang và filter
 */
const getProducts = async (
  page: number = 1,
  itemsPerPage: number = 10,
  queryFilter: ProductQueryFilter = {}
): Promise<PaginatedProductsResult> => {
  try {
    const { search, categoryId, sort, minPrice, maxPrice } = queryFilter

    // Build Prisma filter
    const filter: ProductFilter = {}

    if (search) {
      filter.search = search
    }

    // Filter by categoryId directly
    if (categoryId) {
      filter.categoryId = categoryId
    }

    if (minPrice !== undefined) {
      filter.minPrice = minPrice
    }
    if (maxPrice !== undefined) {
      filter.maxPrice = maxPrice
    }

    // Build orderBy
    let orderBy: { [key: string]: 'asc' | 'desc' } = { createdAt: 'desc' }

    if (sort) {
      switch (sort) {
        case 'price_asc':
          orderBy = { price: 'asc' }
          break
        case 'price_desc':
          orderBy = { price: 'desc' }
          break
        case 'rating_desc':
          orderBy = { rating: 'desc' }
          break
        case 'name_asc':
          orderBy = { name: 'asc' }
          break
        case 'name_desc':
          orderBy = { name: 'desc' }
          break
        case 'selled_desc':
          orderBy = { selled: 'desc' }
          break
        default:
          orderBy = { createdAt: 'desc' }
      }
    }

    const result = await productModel.getMany(filter, page, itemsPerPage, orderBy)

    return result
  } catch (error) {
    throw error
  }
}

/**
 * Lấy products theo category (thay thế getProductsByType)
 */
const getProductsByType = async (
  type: string,
  page: number = 1,
  itemsPerPage: number = 10,
  sort: string = 'createdAt'
): Promise<PaginatedProductsResult> => {
  try {
    // Lookup categoryId from type name
    const category = await prisma.category.findFirst({
      where: { name: { equals: type, mode: 'insensitive' } }
    })

    const filter: ProductFilter = {}
    if (category) {
      filter.categoryId = category.id
    }

    // Build orderBy
    let orderBy: { [key: string]: 'asc' | 'desc' } = { createdAt: 'desc' }

    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' }
        break
      case 'price_desc':
        orderBy = { price: 'desc' }
        break
      case 'rating_desc':
        orderBy = { rating: 'desc' }
        break
      case 'name_asc':
        orderBy = { name: 'asc' }
        break
      case 'name_desc':
        orderBy = { name: 'desc' }
        break
      case 'selled_desc':
        orderBy = { selled: 'desc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    const result = await productModel.getMany(filter, page, itemsPerPage, orderBy)

    return result
  } catch (error) {
    throw error
  }
}

/**
 * Upload ảnh lên Cloudinary
 */
const uploadImage = async (fileBuffer: Buffer, folderName: string = 'products'): Promise<UploadResult> => {
  try {
    const uploadResult = await CloudinaryProvider.streamUpload(fileBuffer, folderName)

    return uploadResult as UploadResult
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Lỗi upload ảnh lên Cloudinary: ${(error as Error).message}`)
  }
}

export const productService = {
  createNew,
  getDetails,
  update,
  deleteProduct,
  deleteSelectedProducts,
  getProducts,
  getProductsByType,
  uploadImage
}
