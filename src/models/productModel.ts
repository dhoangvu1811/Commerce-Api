/**
 * Product Model
 * Quản lý dữ liệu sản phẩm trong MongoDB
 */

import { z } from 'zod'
import { ObjectId } from 'mongodb'
import type {
  WithId,
  Document,
  Filter,
  Sort,
  DeleteResult,
  UpdateResult,
  ClientSession
} from 'mongodb'
import { GET_DB } from '~/config/mongodb.js'
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  PaginatedProductsModelResult
} from '~/types/product.types.js'

/** Tên collection trong MongoDB */
const PRODUCT_COLLECTION_NAME = 'products'

/** Schema validation với Zod */
const PRODUCT_COLLECTION_SCHEMA = z.object({
  name: z.string().min(2).max(255),
  image: z.string().url(),
  type: z.string().min(2).max(100),
  countInStock: z.number().int().min(0),
  price: z.number().positive(),
  rating: z.number().min(0).max(5).default(0),
  description: z.string().max(1000).default(''),
  selled: z.number().int().min(0).default(0),
  discount: z.number().min(0).max(100).default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
})

/** Product document từ MongoDB */
export type ProductDocument = WithId<Document> & Product

/** Kết quả phân trang (alias từ types) */
export type PaginatedProductsResult =
  PaginatedProductsModelResult<ProductDocument>

/** MongoDB session options */
interface SessionOptions {
  session?: ClientSession
}

/**
 * Validate dữ liệu trước khi tạo product
 */
const validateBeforeCreate = (data: CreateProductInput): CreateProductInput => {
  const validData = PRODUCT_COLLECTION_SCHEMA.parse(data)
  return validData as CreateProductInput
}

/**
 * Tạo product mới
 */
const createNew = async (
  data: CreateProductInput
): Promise<ProductDocument | null> => {
  try {
    const validData = validateBeforeCreate(data)
    const createdProduct = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .insertOne(validData)

    return (await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .findOne({ _id: createdProduct.insertedId })) as ProductDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm product theo ID
 */
const findOneById = async (
  productId: string
): Promise<ProductDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(productId) })

    return result as ProductDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm product theo tên và type (case-insensitive)
 */
const findByNameAndType = async (
  name: string,
  type: string
): Promise<ProductDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        type: { $regex: new RegExp(`^${type}$`, 'i') }
      })

    return result as ProductDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm nhiều products theo danh sách IDs
 */
const findByIds = async (
  productIds: ObjectId[]
): Promise<ProductDocument[]> => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .find({ _id: { $in: productIds } })
      .toArray()

    return result as ProductDocument[]
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Lấy danh sách products với phân trang
 */
const getMany = async (
  filter: Filter<Document> = {},
  page: number = 1,
  itemsPerPage: number = 10,
  sortOptions: Sort = {}
): Promise<PaginatedProductsResult> => {
  try {
    const skip = (page - 1) * itemsPerPage

    const products = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(itemsPerPage)
      .toArray()

    const totalProducts = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .countDocuments(filter)

    const totalPages = Math.ceil(totalProducts / itemsPerPage)

    return {
      products: products as ProductDocument[],
      pagination: {
        page: parseInt(String(page)),
        itemsPerPage: parseInt(String(itemsPerPage)),
        totalProducts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Cập nhật thông tin product
 */
const update = async (
  productId: string,
  updateData: UpdateProductInput
): Promise<ProductDocument | null> => {
  try {
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    }

    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(productId) },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      )

    return result as ProductDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Xóa product theo ID
 */
const deleteOneById = async (productId: string): Promise<DeleteResult> => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(productId) })

    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Xóa nhiều products theo filter
 */
const deleteMany = async (
  filter: Filter<Document> = {}
): Promise<DeleteResult> => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .deleteMany(filter)

    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Giảm tồn kho atomically nếu đủ hàng
 */
const decrementStock = async (
  productId: string,
  qty: number,
  options: SessionOptions = {}
): Promise<UpdateResult> => {
  try {
    const updateOptions = options.session ? { session: options.session } : {}
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(productId), countInStock: { $gte: qty } },
        { $inc: { countInStock: -qty }, $set: { updatedAt: new Date() } },
        updateOptions
      )
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tăng tồn kho (dùng cho rollback khi thất bại)
 */
const incrementStock = async (
  productId: string,
  qty: number,
  options: SessionOptions = {}
): Promise<UpdateResult> => {
  try {
    const updateOptions = options.session ? { session: options.session } : {}
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(productId) },
        { $inc: { countInStock: qty }, $set: { updatedAt: new Date() } },
        updateOptions
      )
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tăng số lượng đã bán
 */
const incrementSelled = async (
  productId: string,
  qty: number,
  options: SessionOptions = {}
): Promise<UpdateResult> => {
  try {
    const updateOptions = options.session ? { session: options.session } : {}
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(productId) },
        { $inc: { selled: qty }, $set: { updatedAt: new Date() } },
        updateOptions
      )
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Giảm số lượng đã bán (dùng khi hủy đơn đã thanh toán)
 * Sử dụng atomic operation với condition selled >= qty để tránh negative value
 */
const decrementSelled = async (
  productId: string,
  qty: number,
  options: SessionOptions = {}
): Promise<UpdateResult> => {
  try {
    const updateOptions = options.session ? { session: options.session } : {}
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(productId), selled: { $gte: qty } },
        { $inc: { selled: -qty }, $set: { updatedAt: new Date() } },
        updateOptions
      )
    // Nếu không match (selled < qty), set selled = 0 thay vì để negative
    if (result.matchedCount === 0) {
      await GET_DB()
        .collection(PRODUCT_COLLECTION_NAME)
        .updateOne(
          { _id: new ObjectId(productId) },
          { $set: { selled: 0, updatedAt: new Date() } },
          updateOptions
        )
    }
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Lấy tất cả các loại sản phẩm (distinct types)
 */
const getAllTypes = async (): Promise<string[]> => {
  try {
    const types = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .distinct('type')

    // Filter out null/undefined/empty values and sort
    return (types as string[]).filter((type) => type && type.trim()).sort()
  } catch (error) {
    throw new Error(String(error))
  }
}

export const productModel = {
  PRODUCT_COLLECTION_NAME,
  PRODUCT_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findByNameAndType,
  findByIds,
  getMany,
  update,
  deleteOneById,
  deleteMany,
  decrementStock,
  incrementStock,
  incrementSelled,
  decrementSelled,
  getAllTypes
}
