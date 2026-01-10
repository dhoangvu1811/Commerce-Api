/**
 * Order Model
 * Quản lý dữ liệu đơn hàng trong MongoDB
 */

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
import Joi from 'joi'
import { ORDER_STATUS, PAYMENT_STATUS } from '~/utils/constants.js'
import type {
  Order,
  OrderStatus,
  PaymentStatus,
  OrderItem,
  LogEntry,
  ShippingAddress,
  OrderVoucher,
  OrderTotals
} from '~/types/order.types.js'

// ============================================================
// === Collection Definition ===
// ============================================================

/** Tên collection trong MongoDB */
const ORDER_COLLECTION_NAME = 'orders'

/** Schema cho order item */
const ORDER_ITEM_SCHEMA = Joi.object({
  productId: Joi.string().required(),
  name: Joi.string().required(),
  image: Joi.string().uri().required(),
  unitPrice: Joi.number().required().positive().precision(2),
  discount: Joi.number().min(0).max(100).precision(2).default(0),
  quantity: Joi.number().integer().min(1).required(),
  lineTotal: Joi.number().required().min(0).precision(2)
})

/** Schema cho log entry */
const LOG_ENTRY_SCHEMA = Joi.object({
  action: Joi.string().required(),
  by: Joi.string().allow(null).default(null),
  byRole: Joi.string().valid('user', 'admin', 'system').default('system'),
  at: Joi.date().timestamp().default(Date.now),
  note: Joi.string().allow('').default(''),
  fromStatus: Joi.string()
    .valid(...ORDER_STATUS)
    .allow(null)
    .default(null),
  toStatus: Joi.string()
    .valid(...ORDER_STATUS)
    .allow(null)
    .default(null),
  meta: Joi.object().unknown(true).default({})
})

/** Schema validation với Joi */
const ORDER_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  orderCode: Joi.string().required(),
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
    voucherId: Joi.string().optional(),
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
    .valid(...ORDER_STATUS)
    .default('PENDING'),
  paymentStatus: Joi.string()
    .valid(...PAYMENT_STATUS)
    .default('PENDING'),
  paymentMethod: Joi.string().allow('').default(''),
  logs: Joi.array().items(LOG_ENTRY_SCHEMA).default([]),
  deliveredAt: Joi.date().timestamp().allow(null).default(null),
  createdAt: Joi.date().timestamp().default(Date.now),
  updatedAt: Joi.date().timestamp().default(Date.now)
})

// ============================================================
// === Types ===
// ============================================================

/** Order document từ MongoDB */
export type OrderDocument = WithId<Document> & Order

/** Input data để tạo order mới */
interface CreateOrderInput {
  userId: string
  orderCode: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  voucher?: OrderVoucher | null
  totals: OrderTotals
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  paymentMethod?: string
  logs?: LogEntry[]
  createdAt?: Date
  updatedAt?: Date
}

/** Input data để update order */
interface UpdateOrderInput {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  paymentMethod?: string
  deliveredAt?: Date | null
  voucher?: OrderVoucher | null
  updatedAt?: Date
}

/** Kết quả phân trang */
export interface PaginatedOrdersResult {
  orders: OrderDocument[]
  pagination: {
    page: number
    itemsPerPage: number
    totalOrders: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/** MongoDB session options */
interface SessionOptions {
  session?: ClientSession
}

/** Order logs projection result */
interface OrderLogsResult {
  _id: ObjectId
  orderCode: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  logs: LogEntry[]
}

// ============================================================
// === Private Functions ===
// ============================================================

/**
 * Validate dữ liệu trước khi tạo order
 */
const validateBeforeCreate = async (
  data: CreateOrderInput
): Promise<CreateOrderInput> => {
  const validData = await ORDER_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    allowUnknown: false
  })
  return validData
}

// ============================================================
// === CRUD Operations ===
// ============================================================

/**
 * Tạo order mới
 */
const createNew = async (
  data: CreateOrderInput,
  options: SessionOptions = {}
): Promise<OrderDocument | null> => {
  try {
    const validData = await validateBeforeCreate(data)
    const dataToInsert = {
      ...validData,
      userId: new ObjectId(validData.userId)
    }
    const insertOptions = options.session ? { session: options.session } : {}
    const created = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .insertOne(dataToInsert, insertOptions)

    return (await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .findOne(
        { _id: created.insertedId },
        insertOptions
      )) as OrderDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm order theo ID
 */
const findOneById = async (orderId: string): Promise<OrderDocument | null> => {
  try {
    return (await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(orderId) })) as OrderDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Lấy danh sách orders với phân trang
 */
const getMany = async (
  filter: Filter<Document> = {},
  page: number = 1,
  itemsPerPage: number = 10,
  sortOptions: Sort = { createdAt: -1 }
): Promise<PaginatedOrdersResult> => {
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
      orders: orders as OrderDocument[],
      pagination: {
        page: parseInt(String(page)),
        itemsPerPage: parseInt(String(itemsPerPage)),
        totalOrders,
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
 * Cập nhật thông tin order
 */
const update = async (
  orderId: string,
  updateData: UpdateOrderInput,
  options: SessionOptions = {}
): Promise<OrderDocument | null> => {
  try {
    const dataToUpdate = { ...updateData, updatedAt: new Date() }
    const updateOptions = options.session
      ? { returnDocument: 'after' as const, session: options.session }
      : { returnDocument: 'after' as const }

    const result = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(orderId) },
        { $set: dataToUpdate },
        updateOptions
      )

    return result as OrderDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Thêm log entry vào order
 */
const appendLog = async (
  orderId: string,
  logEntry: LogEntry,
  options: SessionOptions = {}
): Promise<UpdateResult> => {
  try {
    const updateOptions = options.session ? { session: options.session } : {}
    const result = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(orderId) },
        {
          $push: { logs: logEntry as unknown },
          $set: { updatedAt: new Date() }
        } as Document,
        updateOptions
      )
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Xóa order theo ID
 */
const deleteOneById = async (
  orderId: string,
  options: SessionOptions = {}
): Promise<DeleteResult> => {
  try {
    const deleteOptions = options.session ? { session: options.session } : {}
    const result = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(orderId) }, deleteOptions)
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Lấy logs của order theo ID
 */
const getLogsByOrderId = async (
  orderId: string
): Promise<OrderLogsResult | null> => {
  try {
    const order = await GET_DB()
      .collection(ORDER_COLLECTION_NAME)
      .findOne(
        { _id: new ObjectId(orderId) },
        { projection: { logs: 1, orderCode: 1, status: 1, paymentStatus: 1 } }
      )
    return order as OrderLogsResult | null
  } catch (error) {
    throw new Error(String(error))
  }
}

// ============================================================
// === Export ===
// ============================================================

export const orderModel = {
  ORDER_COLLECTION_NAME,
  ORDER_COLLECTION_SCHEMA,
  ORDER_STATUS,
  PAYMENT_STATUS,
  createNew,
  findOneById,
  getMany,
  update,
  appendLog,
  deleteOneById,
  getLogsByOrderId
}
