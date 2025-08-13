import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import Joi from 'joi'

const ORDER_COLLECTION_NAME = 'orders'

const ORDER_ITEM_SCHEMA = Joi.object({
  productId: Joi.string().required(),
  name: Joi.string().required(),
  image: Joi.string().uri().required(),
  unitPrice: Joi.number().required().positive().precision(2),
  discount: Joi.number().min(0).max(100).precision(2).default(0),
  quantity: Joi.number().integer().min(1).required(),
  lineTotal: Joi.number().required().min(0).precision(2)
})

const LOG_ENTRY_SCHEMA = Joi.object({
  action: Joi.string().required(),
  by: Joi.string().allow(null).default(null),
  byRole: Joi.string().valid('user', 'admin', 'system').default('system'),
  at: Joi.date().timestamp().default(Date.now),
  note: Joi.string().allow('').default(''),
  fromStatus: Joi.string()
    .valid('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled')
    .allow(null)
    .default(null),
  toStatus: Joi.string()
    .valid('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled')
    .allow(null)
    .default(null),
  meta: Joi.object().unknown(true).default({})
})

const ORDER_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  items: Joi.array().items(ORDER_ITEM_SCHEMA).min(1).required(),
  shippingAddress: Joi.object({
    id: Joi.string().allow('').optional(),
    name: Joi.string().required(),
    phone: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    province: Joi.string().required(),
    postalCode: Joi.string().allow('').optional(),
    isDefault: Joi.boolean().optional(),
    fullAddress: Joi.string().allow('').optional()
  }).required(),
  voucher: Joi.object({
    code: Joi.string().required(),
    type: Joi.string().valid('percent', 'fixed').required(),
    amount: Joi.number().required(),
    maxDiscount: Joi.number().min(0).optional().default(0),
    discountApplied: Joi.number().min(0).required()
  })
    .allow(null)
    .default(null),
  totals: Joi.object({
    subtotal: Joi.number().required().min(0),
    discount: Joi.number().required().min(0),
    shippingFee: Joi.number().required().min(0),
    payable: Joi.number().required().min(0)
  }).required(),
  status: Joi.string()
    .valid('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled')
    .default('pending'),
  paymentStatus: Joi.string()
    .valid('unpaid', 'paid', 'refunded')
    .default('unpaid'),
  paymentMethod: Joi.string().allow('').default(''),
  logs: Joi.array().items(LOG_ENTRY_SCHEMA).default([]),
  createdAt: Joi.date().timestamp().default(Date.now),
  updatedAt: Joi.date().timestamp().default(Date.now)
})

const validateBeforeCreate = async (data) => {
  const validData = await ORDER_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    allowUnknown: false
  })
  return validData
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const dataToInsert = {
      ...validData,
      userId: new ObjectId(validData.userId)
    }
    const created = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .insertOne(dataToInsert)
    return await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .findOne({ _id: created.insertedId })
  } catch (error) {
    throw new Error(error)
  }
}

const findOneById = async (orderId) => {
  try {
    return await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(orderId) })
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
    const orders = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(itemsPerPage)
      .toArray()

    const totalOrders = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .countDocuments(filter)

    const totalPages = Math.ceil(totalOrders / itemsPerPage)

    return {
      orders,
      pagination: {
        page: parseInt(page),
        itemsPerPage: parseInt(itemsPerPage),
        totalOrders,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const update = async (orderId, updateData) => {
  try {
    const dataToUpdate = { ...updateData, updatedAt: new Date() }
    const result = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(orderId) },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const appendLog = async (orderId, logEntry) => {
  try {
    const result = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(orderId) },
        { $push: { logs: logEntry }, $set: { updatedAt: new Date() } }
      )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const orderModel = {
  ORDER_COLLECTION_NAME,
  ORDER_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  getMany,
  update,
  appendLog
}
