/**
 * Order Model
 * Quản lý dữ liệu đơn hàng trong MongoDB
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
import { ORDER_STATUS, PAYMENT_STATUS } from '~/utils/constants.js'
import type {
  Order,
  OrderStatus,
  PaymentStatus,
  OrderItem,
  LogEntry,
  ShippingAddress,
  OrderVoucher,
  OrderTotals,
  PaginatedOrdersModelResult,
  UpdateOrderInput
} from '~/types/order.types.js'

/** Tên collection trong MongoDB */
const ORDER_COLLECTION_NAME = 'orders'

/** Schema cho order item */
const ORDER_ITEM_SCHEMA = z.object({
  productId: z.string(),
  name: z.string(),
  image: z.string().url(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).max(100).default(0),
  quantity: z.number().int().min(1),
  lineTotal: z.number().min(0)
})

/** Schema cho log entry */
const LOG_ENTRY_SCHEMA = z.object({
  action: z.string(),
  by: z.string().nullable().default(null),
  byRole: z.enum(['user', 'admin', 'system']).default('system'),
  at: z.date().default(() => new Date()),
  note: z.string().default(''),
  fromStatus: z
    .enum(ORDER_STATUS as unknown as readonly [string, ...string[]])
    .nullable()
    .default(null),
  toStatus: z
    .enum(ORDER_STATUS as unknown as readonly [string, ...string[]])
    .nullable()
    .default(null),
  meta: z.record(z.string(), z.unknown()).default({})
})

/** Shipping address schema */
const SHIPPING_ADDRESS_SCHEMA = z.object({
  id: z.string().optional().default(''),
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  province: z.string(),
  postalCode: z.string().optional().default(''),
  isDefault: z.boolean().optional(),
  fullAddress: z.string().optional().default('')
})

/** Voucher schema */
const ORDER_VOUCHER_SCHEMA = z
  .object({
    voucherId: z.string().optional(),
    code: z.string(),
    type: z.enum(['percent', 'fixed']),
    amount: z.number(),
    maxDiscount: z.number().min(0).default(0),
    discountApplied: z.number().min(0)
  })
  .nullable()
  .default(null)

/** Totals schema */
const ORDER_TOTALS_SCHEMA = z.object({
  subtotal: z.number().min(0),
  discount: z.number().min(0),
  shippingFee: z.number().min(0),
  payable: z.number().min(0)
})

/** Schema validation với Zod */
const ORDER_COLLECTION_SCHEMA = z.object({
  userId: z.string(),
  orderCode: z.string(),
  items: z.array(ORDER_ITEM_SCHEMA).min(1),
  shippingAddress: SHIPPING_ADDRESS_SCHEMA,
  voucher: ORDER_VOUCHER_SCHEMA,
  totals: ORDER_TOTALS_SCHEMA,
  status: z
    .enum(ORDER_STATUS as unknown as readonly [string, ...string[]])
    .default('PENDING'),
  paymentStatus: z
    .enum(PAYMENT_STATUS as unknown as readonly [string, ...string[]])
    .default('PENDING'),
  paymentMethod: z.string().default(''),
  logs: z.array(LOG_ENTRY_SCHEMA).default([]),
  deliveredAt: z.date().nullable().default(null),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
})

/** Order document từ MongoDB */
export type OrderDocument = WithId<Document> & Order

/** Input data để tạo order mới (internal - đầy đủ) */
interface CreateOrderModelInput {
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

/** Kết quả phân trang (alias từ types) */
export type PaginatedOrdersResult = PaginatedOrdersModelResult<OrderDocument>

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

/**
 * Validate dữ liệu trước khi tạo order
 */
const validateBeforeCreate = (
  data: CreateOrderModelInput
): CreateOrderModelInput => {
  const validData = ORDER_COLLECTION_SCHEMA.parse(data)
  return validData as unknown as CreateOrderModelInput
}

/**
 * Tạo order mới
 */
const createNew = async (
  data: CreateOrderModelInput,
  options: SessionOptions = {}
): Promise<OrderDocument | null> => {
  try {
    const validData = validateBeforeCreate(data)
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
