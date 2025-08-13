import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import Joi from 'joi'

//Define Collection (Name & Schema)
const PRODUCT_COLLECTION_NAME = 'products'
const PRODUCT_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().trim().min(2).max(255),
  image: Joi.string().required().uri(),
  type: Joi.string().required().trim().min(2).max(100),
  countInStock: Joi.number().required().integer().min(0),
  price: Joi.number().required().positive().precision(2),
  rating: Joi.number().min(0).max(5).precision(1).default(0),
  description: Joi.string().trim().max(1000).allow('').default(''),
  selled: Joi.number().integer().min(0).default(0),
  discount: Joi.number().min(0).max(100).precision(2).default(0),
  createdAt: Joi.date().timestamp().default(Date.now),
  updatedAt: Joi.date().timestamp().default(Date.now)
})

const validateBeforeCreate = async (data) => {
  const validData = await PRODUCT_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    allowUnknown: false
  })

  return validData
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdProduct = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .insertOne(validData)

    return await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .findOne({ _id: createdProduct.insertedId })
  } catch (error) {
    throw new Error(error)
  }
}

const findOneById = async (productId) => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(productId)
      })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findByNameAndType = async (name, type) => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }, // Case-insensitive exact match
        type: { $regex: new RegExp(`^${type}$`, 'i') } // Case-insensitive exact match
      })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findByIds = async (productIds) => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .find({
        _id: { $in: productIds }
      })
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getMany = async (
  filter = {},
  page = 1,
  itemsPerPage = 10,
  sortOptions = {}
) => {
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
      products,
      pagination: {
        page: parseInt(page),
        itemsPerPage: parseInt(itemsPerPage),
        totalProducts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const update = async (productId, updateData) => {
  try {
    // Thêm updatedAt vào dữ liệu update
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

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteOneById = async (productId) => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .deleteOne({
        _id: new ObjectId(productId)
      })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteMany = async (filter = {}) => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .deleteMany(filter)

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Giảm tồn kho atomically nếu đủ hàng
const decrementStock = async (productId, qty) => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(productId), countInStock: { $gte: qty } },
        { $inc: { countInStock: -qty }, $set: { updatedAt: new Date() } }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Tăng tồn kho (dùng cho rollback khi thất bại)
const incrementStock = async (productId, qty) => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(productId) },
        { $inc: { countInStock: qty }, $set: { updatedAt: new Date() } }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Tăng số lượng đã bán
const incrementSelled = async (productId, qty) => {
  try {
    const result = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(productId) },
        { $inc: { selled: qty }, $set: { updatedAt: new Date() } }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getAllTypes = async () => {
  try {
    const types = await GET_DB()
      .collection(PRODUCT_COLLECTION_NAME)
      .distinct('type')

    // Filter out null/undefined/empty values and sort
    return types.filter((type) => type && type.trim()).sort()
  } catch (error) {
    throw new Error(error)
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
  getAllTypes
}
