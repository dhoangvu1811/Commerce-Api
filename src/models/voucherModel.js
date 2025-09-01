import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import Joi from 'joi'

// Define Collection (Name & Schema)
const VOUCHER_COLLECTION_NAME = 'vouchers'
const VOUCHER_COLLECTION_SCHEMA = Joi.object({
  code: Joi.string()
    .required()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[A-Z0-9-_]+$/),
  type: Joi.string().valid('percent', 'fixed').required(),
  amount: Joi.number().required().positive().precision(2),
  maxDiscount: Joi.number().optional().min(0).precision(2).default(0),
  minOrderValue: Joi.number().optional().min(0).precision(2).default(0),
  usageLimit: Joi.number().integer().min(0).default(0), // 0 = không giới hạn
  usedCount: Joi.number().integer().min(0).default(0),
  startDate: Joi.date().allow(null).default(null),
  endDate: Joi.date().allow(null).default(null),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.date().timestamp().default(Date.now),
  updatedAt: Joi.date().timestamp().default(Date.now)
})

const validateBeforeCreate = async (data) => {
  const validData = await VOUCHER_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    allowUnknown: false
  })

  return validData
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const created = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .insertOne(validData)

    return await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOne({ _id: created.insertedId })
  } catch (error) {
    throw new Error(error)
  }
}

const findOneById = async (voucherId) => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(voucherId) })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findOneByCode = async (code) => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOne({ code: { $regex: new RegExp(`^${code}$`, 'i') } })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getMany = async (
  filter = {},
  page = 1,
  itemsPerPage = 10,
  sortOptions = { createdAt: -1 }
) => {
  try {
    const skip = (page - 1) * itemsPerPage

    const vouchers = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(itemsPerPage)
      .toArray()

    const totalVouchers = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .countDocuments(filter)

    const totalPages = Math.ceil(totalVouchers / itemsPerPage)

    return {
      vouchers,
      pagination: {
        page: parseInt(page),
        itemsPerPage: parseInt(itemsPerPage),
        totalVouchers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const update = async (voucherId, updateData) => {
  try {
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    }

    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(voucherId) },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteOneById = async (voucherId) => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(voucherId) })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const incrementUsedCount = async (voucherId, step = 1) => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(voucherId) },
        { $inc: { usedCount: step }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Giảm số lần đã sử dụng voucher (dùng khi hủy đơn đã thanh toán)
const decrementUsedCount = async (voucherId, step = 1) => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(voucherId) },
        { $inc: { usedCount: -step }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findByIds = async (ids) => {
  try {
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .find({ _id: { $in: ids } })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteManyByIds = async (idStrings) => {
  try {
    const objectIds = idStrings.map((id) => new ObjectId(id))
    const result = await GET_DB()
      .collection(VOUCHER_COLLECTION_NAME)
      .deleteMany({ _id: { $in: objectIds } })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const voucherModel = {
  VOUCHER_COLLECTION_NAME,
  VOUCHER_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findOneByCode,
  getMany,
  update,
  deleteOneById,
  incrementUsedCount,
  decrementUsedCount,
  findByIds,
  deleteManyByIds
}
