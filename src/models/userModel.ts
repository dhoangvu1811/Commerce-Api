/**
 * User Model
 * Quản lý dữ liệu người dùng trong MongoDB
 */

import { z } from 'zod'
import { ObjectId } from 'mongodb'
import type { WithId, Document, Filter, Sort, DeleteResult } from 'mongodb'
import { GET_DB } from '~/config/mongodb.js'
import {
  EMAIL_RULE,
  PASSWORD_RULE,
  coerceDateNullable
} from '~/utils/zodValidators.js'
import type {
  User,
  CreateUserInput,
  UpdateUserInputExtended as UpdateUserInput,
  PaginatedUsersModelResult
} from '~/types/user.types.js'

/** Tên collection trong MongoDB */
const USER_COLLECTION_NAME = 'users'

/** Schema validation với Zod */
const USER_COLLECTION_SCHEMA = z.object({
  name: z.string().min(2).max(100),
  email: z.string().regex(EMAIL_RULE).toLowerCase(),
  password: z.string().regex(PASSWORD_RULE),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]+$/)
    .min(10)
    .max(15)
    .or(z.literal(''))
    .default(''),
  address: z.string().max(500).default(''),
  avatar: z.string().url().or(z.literal('')).default(''),
  dateOfBirth: coerceDateNullable.default(null),
  gender: z.enum(['male', 'female', 'other', '']).default(''),
  role: z.enum(['admin', 'user']).default('user'),
  isActive: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
  typeAccount: z.enum(['LOCAL', 'GOOGLE', 'FACEBOOK']).default('LOCAL'),
  lastLogin: coerceDateNullable.default(null),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
})

/** User document từ MongoDB */
export type UserDocument = WithId<Document> & User

/**
 * Validate dữ liệu trước khi tạo user
 */
const validateBeforeCreate = (data: CreateUserInput): CreateUserInput => {
  const validData = USER_COLLECTION_SCHEMA.parse(data)
  return validData as CreateUserInput
}

/**
 * Tạo user mới
 */
const createNew = async (
  data: CreateUserInput
): Promise<UserDocument | null> => {
  try {
    const validData = validateBeforeCreate(data)
    const createdUser = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .insertOne(validData)

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
): Promise<PaginatedUsersModelResult<UserDocument>> => {
  try {
    const skip = (page - 1) * itemsPerPage

    const users = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(itemsPerPage)
      .toArray()

    const totalUsers = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .countDocuments(filter)

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
const update = async (
  userId: string,
  updateData: UpdateUserInput
): Promise<UserDocument | null> => {
  try {
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    }

    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $set: dataToUpdate },
        { returnDocument: 'after' }
      )

    return result as UserDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Cập nhật thời gian đăng nhập cuối
 */
const updateLastLogin = async (
  userId: string
): Promise<UserDocument | null> => {
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
const findActiveUserById = async (
  userId: string
): Promise<UserDocument | null> => {
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
const findActiveUserByEmail = async (
  email: string
): Promise<UserDocument | null> => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
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
const deleteMany = async (
  filter: Filter<Document> = {}
): Promise<DeleteResult> => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .deleteMany(filter)

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
