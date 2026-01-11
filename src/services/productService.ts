/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable indent */
/**
 * Product Service
 * Xử lý logic business cho product
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { productModel } from '~/models/productModel.js'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider.js'
import { ObjectId } from 'mongodb'
import type {
  Product,
  ProductQueryFilter,
  ProductFilter
} from '~/types/product.types.js'
import type {
  PaginationInfo,
  SortOptions,
  UploadResult,
  DeleteResultInfo
} from '~/types/common.types.js'

// ============================================================
// === Types ===
// ============================================================

/** Paginated products result */
interface PaginatedProductsResult {
  products: Product[]
  pagination: PaginationInfo
}

// ============================================================
// === Functions ===
// ============================================================

/**
 * Tạo product mới
 */
const createNew = async (productData: Partial<Product>): Promise<Product> => {
  try {
    // Kiểm tra sản phẩm đã tồn tại chưa (theo tên và loại)
    const existingProduct = await productModel.findByNameAndType(
      productData.name!,
      productData.type!
    )

    if (existingProduct) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Sản phẩm "${productData.name}" thuộc loại "${productData.type}" đã tồn tại`
      )
    }

    // Tạo sản phẩm mới
    const newProduct: Partial<Product> = {
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const createdProduct = await productModel.createNew(newProduct as Product)

    return createdProduct as Product
  } catch (error) {
    throw error
  }
}

/**
 * Lấy chi tiết product
 */
const getDetails = async (productId: string): Promise<Product> => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID sản phẩm không hợp lệ')
    }

    const product = await productModel.findOneById(productId)

    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
    }

    return product as Product
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật product
 */
const update = async (
  productId: string,
  updateData: Partial<Product>
): Promise<Product> => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID sản phẩm không hợp lệ')
    }

    // Kiểm tra sản phẩm có tồn tại không
    const existingProduct = await productModel.findOneById(productId)
    if (!existingProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
    }

    // Kiểm tra duplicate nếu có thay đổi name hoặc type
    if (updateData.name || updateData.type) {
      const nameToCheck = updateData.name || existingProduct.name
      const typeToCheck = updateData.type || existingProduct.type

      const duplicateProduct = await productModel.findByNameAndType(
        nameToCheck,
        typeToCheck
      )

      // Nếu tìm thấy sản phẩm trùng và không phải là chính sản phẩm đang update
      if (duplicateProduct && duplicateProduct._id?.toString() !== productId) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Sản phẩm "${nameToCheck}" thuộc loại "${typeToCheck}" đã tồn tại`
        )
      }
    }

    // Cập nhật sản phẩm
    const dataToUpdate: Partial<Product> = {
      ...updateData,
      updatedAt: new Date()
    }

    const updatedProduct = await productModel.update(productId, dataToUpdate)

    return updatedProduct as Product
  } catch (error) {
    throw error
  }
}

/**
 * Xóa product
 */
const deleteProduct = async (productId: string): Promise<DeleteResultInfo> => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID sản phẩm không hợp lệ')
    }

    // Kiểm tra sản phẩm có tồn tại không
    const existingProduct = await productModel.findOneById(productId)
    if (!existingProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
    }

    // Xóa sản phẩm
    const result = await productModel.deleteOneById(productId)

    return {
      deletedCount: result.deletedCount,
      message: 'Đã xóa sản phẩm thành công'
    }
  } catch (error) {
    throw error
  }
}

/**
 * Xóa nhiều products
 */
const deleteSelectedProducts = async (
  productIds: string[]
): Promise<DeleteResultInfo> => {
  try {
    // Validate input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Danh sách ID sản phẩm không hợp lệ'
      )
    }

    // Validate tất cả ObjectIds
    const invalidIds = productIds.filter((id) => !ObjectId.isValid(id))
    if (invalidIds.length > 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `ID sản phẩm không hợp lệ: ${invalidIds.join(', ')}`
      )
    }

    // Chuyển đổi string IDs thành ObjectIds
    const objectIds = productIds.map((id) => new ObjectId(id))

    // Kiểm tra các sản phẩm có tồn tại không
    const existingProducts = await productModel.findByIds(objectIds)
    const existingIds = existingProducts.map((product) =>
      product._id?.toString()
    )
    const notFoundIds = productIds.filter((id) => !existingIds.includes(id))

    if (notFoundIds.length > 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Không tìm thấy sản phẩm với ID: ${notFoundIds.join(', ')}`
      )
    }

    // Xóa các sản phẩm đã chọn
    const result = await productModel.deleteMany({
      _id: { $in: objectIds }
    })

    return {
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} sản phẩm được chọn`,
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
    const { search, type, sort } = queryFilter

    // Tạo filter object
    const filter: ProductFilter = {}

    // Tìm kiếm theo tên
    if (search) {
      filter.name = { $regex: search, $options: 'i' }
    }

    // Lọc theo loại
    if (type) {
      filter.type = type
    }

    // Tạo sort object
    let sortOptions: SortOptions = { createdAt: -1 } // Mặc định sắp xếp theo ngày tạo mới nhất

    if (sort) {
      switch (sort) {
        case 'price_asc':
          sortOptions = { price: 1 }
          break
        case 'price_desc':
          sortOptions = { price: -1 }
          break
        case 'rating_desc':
          sortOptions = { rating: -1 }
          break
        case 'name_asc':
          sortOptions = { name: 1 }
          break
        case 'name_desc':
          sortOptions = { name: -1 }
          break
        case 'selled_desc':
          sortOptions = { selled: -1 }
          break
        default:
          sortOptions = { createdAt: -1 }
      }
    }

    const result = await productModel.getMany(
      filter,
      page,
      itemsPerPage,
      sortOptions
    )

    return result as PaginatedProductsResult
  } catch (error) {
    throw error
  }
}

/**
 * Lấy products theo type
 */
const getProductsByType = async (
  type: string,
  page: number = 1,
  itemsPerPage: number = 10,
  sort: string = 'createdAt'
): Promise<PaginatedProductsResult> => {
  try {
    const filter = { type }

    // Tạo sort object
    let sortOptions: SortOptions = { createdAt: -1 }

    if (sort) {
      switch (sort) {
        case 'price_asc':
          sortOptions = { price: 1 }
          break
        case 'price_desc':
          sortOptions = { price: -1 }
          break
        case 'rating_desc':
          sortOptions = { rating: -1 }
          break
        case 'name_asc':
          sortOptions = { name: 1 }
          break
        case 'name_desc':
          sortOptions = { name: -1 }
          break
        case 'selled_desc':
          sortOptions = { selled: -1 }
          break
        default:
          sortOptions = { createdAt: -1 }
      }
    }

    const result = await productModel.getMany(
      filter,
      page,
      itemsPerPage,
      sortOptions
    )

    return result as PaginatedProductsResult
  } catch (error) {
    throw error
  }
}

/**
 * Lấy tất cả types
 */
const getAllTypes = async (): Promise<string[]> => {
  try {
    const types = await productModel.getAllTypes()

    return types
  } catch (error) {
    throw error
  }
}

/**
 * Upload ảnh lên Cloudinary
 */
const uploadImage = async (
  fileBuffer: Buffer,
  folderName: string = 'products'
): Promise<UploadResult> => {
  try {
    // Upload ảnh lên Cloudinary
    const uploadResult = await CloudinaryProvider.streamUpload(
      fileBuffer,
      folderName
    )

    return uploadResult as UploadResult
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Lỗi upload ảnh lên Cloudinary: ${(error as Error).message}`
    )
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
  getAllTypes,
  uploadImage
}
