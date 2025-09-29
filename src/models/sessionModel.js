import { GET_DB } from '~/config/mongodb'
import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Define Collection (Name & Schema)
const SESSION_COLLECTION_NAME = 'sessions'
const SESSION_COLLECTION_SCHEMA = Joi.object({
  sessionId: Joi.string().required().trim(),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
    'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
    'any.required': 'UserId là bắt buộc',
    'string.empty': 'UserId không được để trống'
  }),
  refreshToken: Joi.string().required().trim(),
  deviceInfo: Joi.string().allow('').default(''), // User-Agent hoặc device info
  ipAddress: Joi.string().allow('').default(''),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.date().timestamp().default(Date.now),
  expiresAt: Joi.date().timestamp().required() // Thời gian hết hạn của refresh token
})

const validateBeforeCreate = async (data) => {
  const validData = await SESSION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    allowUnknown: false
  })

  return validData
}

// Tạo session mới
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdSession = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .insertOne(validData)

    return await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .findOne({ _id: createdSession.insertedId })
  } catch (error) {
    throw new Error(error)
  }
}

// Tìm session theo sessionId
const findBySessionId = async (sessionId) => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .findOne({
        sessionId: sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() } // Chỉ lấy session chưa hết hạn
      })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Tìm tất cả session của user (chỉ active và chưa hết hạn)
const findByUserId = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .find({
        userId: userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      })
      .sort({ createdAt: -1 })
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Tìm tất cả session của user (bao gồm cả inactive và hết hạn) - Dành cho Admin
const findAllSessionsByUserId = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Đếm sessions theo userId cho overview table
const getSessionsSummaryByUserId = async (userId) => {
  try {
    const now = new Date()
    const pipeline = [
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          activeSessions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isActive', true] },
                    { $gt: ['$expiresAt', now] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]

    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray()

    return result[0] || { totalSessions: 0, activeSessions: 0 }
  } catch (error) {
    throw new Error(error)
  }
}

// Vô hiệu hóa session (revoke)
const revokeSession = async (sessionId) => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .updateOne(
        { sessionId: sessionId },
        {
          $set: {
            isActive: false,
            updatedAt: Date.now()
          }
        }
      )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Vô hiệu hóa tất cả session của user
const revokeAllUserSessions = async (userId) => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .updateMany(
        { userId: userId, isActive: true },
        {
          $set: {
            isActive: false,
            updatedAt: Date.now()
          }
        }
      )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Xóa session (logout)
const deleteSession = async (sessionId) => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .deleteOne({ sessionId: sessionId })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// Cleanup sessions hết hạn (cron job)
const cleanupExpiredSessions = async () => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .deleteMany({
        expiresAt: { $lt: new Date() }
      })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const sessionModel = {
  SESSION_COLLECTION_NAME,
  SESSION_COLLECTION_SCHEMA,
  createNew,
  findBySessionId,
  findByUserId,
  findAllSessionsByUserId,
  getSessionsSummaryByUserId,
  revokeSession,
  revokeAllUserSessions,
  deleteSession,
  cleanupExpiredSessions
}
