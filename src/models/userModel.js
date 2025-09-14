import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import Joi from 'joi'
import { EMAIL_RULE, PASSWORD_RULE } from '~/utils/validators'

// Define Collection (Name & Schema)
const USER_COLLECTION_NAME = 'users'
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
  isActive: Joi.boolean().default(true),
  emailVerified: Joi.boolean().default(false),
  typeAccount: Joi.string()
    .valid('LOCAL', 'GOOGLE', 'FACEBOOK')
    .default('LOCAL'),
  lastLogin: Joi.date().allow(null).default(null),
  createdAt: Joi.date().timestamp().default(Date.now),
  updatedAt: Joi.date().timestamp().default(Date.now)
})

const validateBeforeCreate = async (data) => {
  const validData = await USER_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    allowUnknown: false
  })

  return validData
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdUser = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .insertOne(validData)

    return await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({ _id: createdUser.insertedId })
  } catch (error) {
    throw new Error(error)
  }
}

const findOneById = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(userId)
      })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findOneByEmail = async (email) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
      email: email.toLowerCase().trim()
    })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findByIds = async (userIds) => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .find({
        _id: { $in: userIds }
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
  sortOptions = { createdAt: -1 }
) => {
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
      users,
      pagination: {
        page: parseInt(page),
        itemsPerPage: parseInt(itemsPerPage),
        totalUsers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const update = async (userId, updateData) => {
  try {
    // Thêm updatedAt vào dữ liệu update
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

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updateLastLogin = async (userId) => {
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

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteOneById = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .deleteOne({
        _id: new ObjectId(userId)
      })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteMany = async (filter = {}) => {
  try {
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .deleteMany(filter)

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteManyByIds = async (userIds) => {
  try {
    const objectIds = userIds.map((id) => new ObjectId(id))
    const result = await GET_DB()
      .collection(USER_COLLECTION_NAME)
      .deleteMany({
        _id: { $in: objectIds }
      })

    return result
  } catch (error) {
    throw new Error(error)
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
  deleteOneById,
  deleteMany,
  deleteManyByIds
}
