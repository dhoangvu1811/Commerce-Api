/**
 * User Model
 * Quản lý dữ liệu người dùng trong MongoDB
 */

import { ObjectId } from 'mongodb'
import type { WithId, Document, Filter, Sort, DeleteResult } from 'mongodb'
import { GET_DB } from '~/config/mongodb.js'
import Joi from 'joi'
import { EMAIL_RULE, PASSWORD_RULE } from '~/utils/validators.js'
import type { User, UserRole, Gender, AccountType } from '~/types/user.types.js'

// ============================================================
// === Collection Definition ===
// ============================================================

/** Tên collection trong MongoDB */
const USER_COLLECTION_NAME = 'users'

/** Schema validation với Joi */
const USER_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  email: Joi.string().required().pattern(EMAIL_RULE).lowercase().trim(),
  password: Joi.string().required().pattern(PASSWORD_RULE),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]+$/)
    .min(10)
    .max(15)
    .allow('')
    .default(''),
  address: Joi.string().trim().max(500).allow('').default(''),
  avatar: Joi.string().uri().allow('').default(''),
  dateOfBirth: Joi.date().max('now').allow(null).default(null),
  gender: Joi.string().valid('male', 'female', 'other').allow('').default(''),
  role: Joi.string().valid('admin', 'user').default('user'),
  isActive: Joi.boolean().default(false),
  emailVerified: Joi.boolean().default(false),
  typeAccount: Joi.string().valid('LOCAL', 'GOOGLE', 'FACEBOOK').default('LOCAL'),
  lastLogin: Joi.date().allow(null).default(null),
  createdAt: Joi.date().timestamp().default(Date.now),
  updatedAt: Joi.date().timestamp().default(Date.now)
})

// ============================================================
// === Types ===
// ============================================================

/** User document từ MongoDB */
export type UserDocument = WithId<Document> & User

/** Input data để tạo user mới */
interface CreateUserInput {
  name: string
  email: string
  password: string
  phone?: string
  address?: string
  avatar?: string
  dateOfBirth?: Date | null
  gender?: Gender
  role?: UserRole
  isActive?: boolean
  emailVerified?: boolean
  typeAccount?: AccountType
}

/** Input data để update user */
interface UpdateUserInput {
  name?: string
  phone?: string
  address?: string
  avatar?: string
  dateOfBirth?: Date | null
  gender?: Gender
  role?: UserRole
  isActive?: boolean
  emailVerified?: boolean
  password?: string
}

/** Kết quả phân trang */
export interface PaginatedUsersResult {
  users: UserDocument[]
  pagination: {
    page: number
    itemsPerPage: number
    totalUsers: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// ============================================================
// === Private Functions ===
// ============================================================

/**
 * Validate dữ liệu trước khi tạo user
 */
const validateBeforeCreate = async (data: CreateUserInput): Promise<CreateUserInput> => {
  const validData = await USER_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    allowUnknown: false
  })
  return validData
}

// ============================================================
// === CRUD Operations ===
// ============================================================

/**
 * Tạo user mới
 */
const createNew = async (data: CreateUserInput): Promise<UserDocument | null> => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)

    return (await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({ _id: createdUser.insertedId })) as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm user theo ID
 */
const findOneById = async (userId: string): Promise<UserDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(userId) })

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm user theo email
 */
const findOneByEmail = async (email: string): Promise<UserDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({ email: email.toLowerCase().trim() })

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm nhiều users theo danh sách IDs
 */
const findByIds = async (userIds: ObjectId[]): Promise<UserDocument[]> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .find({ _id: { $in: userIds } })
      .toArray()

    return result as UserDocument[]
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Lấy danh sách users với phân trang
 */
const getMany = async (
  filter: Filter<Document> = {},
  page: number = 1,
  itemsPerPage: number = 10,
  sortOptions: Sort = { createdAt: -1 }
): Promise<PaginatedUsersResult> => {
  try {
    const skip = (page - 1) * itemsPerPage

    const users = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(itemsPerPage)
      .toArray()

    const totalUsers = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments(filter)

    const totalPages = Math.ceil(totalUsers / itemsPerPage)

    return {
      users: users as UserDocument[],
      pagination: {
        page: parseInt(String(page)),
        itemsPerPage: parseInt(String(itemsPerPage)),
        totalUsers,
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
 * Cập nhật thông tin user
 */
const update = async (userId: string, updateData: UpdateUserInput): Promise<UserDocument | null> => {
  try {
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    }

    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOneAndUpdate({ _id: new ObjectId(userId) }, { $set: dataToUpdate }, { returnDocument: 'after' })

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Cập nhật thời gian đăng nhập cuối
 */
const updateLastLogin = async (userId: string): Promise<UserDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(userId) },
        {
          $set: {
            lastLogin: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Kích hoạt tài khoản user
 */
const activateUser = async (userId: string): Promise<UserDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(userId) },
        {
          $set: {
            isActive: true,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Vô hiệu hóa tài khoản user
 */
const deactivateUser = async (userId: string): Promise<UserDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(userId) },
        {
          $set: {
            isActive: false,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm user active theo ID
 */
const findActiveUserById = async (userId: string): Promise<UserDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(userId),
        isActive: true
      })

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm user active theo email
 */
const findActiveUserByEmail = async (email: string): Promise<UserDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({
        email: email.toLowerCase().trim(),
        isActive: true
      })

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Xóa user theo ID
 */
const deleteOneById = async (userId: string): Promise<DeleteResult> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(userId) })

    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Xóa nhiều users theo filter
 */
const deleteMany = async (filter: Filter<Document> = {}): Promise<DeleteResult> => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).deleteMany(filter)

    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Xóa nhiều users theo danh sách IDs
 */
const deleteManyByIds = async (userIds: string[]): Promise<DeleteResult> => {
  try {
    const objectIds = userIds.map((id) => new ObjectId(id))
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .deleteMany({ _id: { $in: objectIds } })

    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

// ============================================================
// === Export ===
// ============================================================

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findOneByEmail,
  findByIds,
  getMany,
  update,
  updateLastLogin,
  activateUser,
  deactivateUser,
  findActiveUserById,
  findActiveUserByEmail,
  deleteOneById,
  deleteMany,
  deleteManyByIds
}
