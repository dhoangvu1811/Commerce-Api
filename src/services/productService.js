/* eslint-disable indent */
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { productModel } from '~/models/productModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { ObjectId } from 'mongodb'

const createNew = async (productData) => {
  try {
    // Kiểm tra sản phẩm đã tồn tại chưa (theo tên và loại)
    const existingProduct = await productModel.findByNameAndType(
      productData.name,
      productData.type
    )

    if (existingProduct) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Sản phẩm "${productData.name}" thuộc loại "${productData.type}" đã tồn tại`
      )
    }

    // Tạo sản phẩm mới
    const newProduct = {
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const createdProduct = await productModel.createNew(newProduct)

    return createdProduct
  } catch (error) {
    throw error
  }
}

const getDetails = async (productId) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(productId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID sản phẩm không hợp lệ')
    }

    const product = await productModel.findOneById(productId)

    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm')
    }

    return product
  } catch (error) {
    throw error
  }
}

const update = async (productId, updateData) => {
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
      if (duplicateProduct && duplicateProduct._id.toString() !== productId) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Sản phẩm "${nameToCheck}" thuộc loại "${typeToCheck}" đã tồn tại`
        )
      }
    }

    // Cập nhật sản phẩm
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    }

    const updatedProduct = await productModel.update(productId, dataToUpdate)

    return updatedProduct
  } catch (error) {
    throw error
  }
}

const deleteProduct = async (productId) => {
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

    return result
  } catch (error) {
    throw error
  }
}

const deleteSelectedProducts = async (productIds) => {
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
      product._id.toString()
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

const getProducts = async (page = 1, itemsPerPage = 10, queryFilter = {}) => {
  try {
    const { search, type, sort } = queryFilter

    // Tạo filter object
    const filter = {}

    // Tìm kiếm theo tên
    if (search) {
      filter.name = { $regex: search, $options: 'i' }
    }

    // Lọc theo loại
    if (type) {
      filter.type = type
    }

    // Tạo sort object
    let sortOptions = { createdAt: -1 } // Mặc định sắp xếp theo ngày tạo mới nhất

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
      parseInt(page),
      parseInt(itemsPerPage),
      sortOptions
    )

    return result
  } catch (error) {
    throw error
  }
}

const getProductsByType = async (
  type,
  page = 1,
  itemsPerPage = 10,
  sort = 'createdAt'
) => {
  try {
    const filter = { type }

    // Tạo sort object
    let sortOptions = { createdAt: -1 }

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
      parseInt(page),
      parseInt(itemsPerPage),
      sortOptions
    )

    return result
  } catch (error) {
    throw error
  }
}

const getAllTypes = async () => {
  try {
    const types = await productModel.getAllTypes()

    return types
  } catch (error) {
    throw error
  }
}

const uploadImage = async (fileBuffer, folderName = 'products') => {
  try {
    // Upload ảnh lên Cloudinary
    const uploadResult = await CloudinaryProvider.streamUpload(
      fileBuffer,
      folderName
    )

    return uploadResult
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Lỗi upload ảnh lên Cloudinary'
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
