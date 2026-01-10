/**
 * Session Model
 * Quản lý phiên đăng nhập (refresh tokens) của người dùng trong MongoDB
 */

import type { WithId, Document, UpdateResult, DeleteResult } from 'mongodb'
import { GET_DB } from '~/config/mongodb.js'
import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import type { Session } from '~/types/session.types.js'

// ============================================================
// === Collection Definition ===
// ============================================================

/** Tên collection trong MongoDB */
const SESSION_COLLECTION_NAME = 'sessions'

/** Schema validation với Joi */
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
  logoutAt: Joi.date().timestamp().allow(null).default(null), // Thời điểm user logout
  createdAt: Joi.date().timestamp().default(Date.now),
  expiresAt: Joi.date().timestamp().required() // Thời gian hết hạn của refresh token
})

// ============================================================
// === Types ===
// ============================================================

/** Session document từ MongoDB */
export type SessionDocument = WithId<Document> & Session

/** Input data để tạo session mới */
interface CreateSessionInput {
  sessionId: string
  userId: string
  refreshToken: string
  deviceInfo?: string
  ipAddress?: string
  isActive?: boolean
  expiresAt: Date
}

/** Kết quả aggregation cho session summary */
export interface SessionsSummary {
  totalSessions: number
  activeSessions: number
}

// ============================================================
// === Private Functions ===
// ============================================================

/**
 * Validate dữ liệu trước khi tạo session
 */
const validateBeforeCreate = async (
  data: CreateSessionInput
): Promise<CreateSessionInput> => {
  const validData = await SESSION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
    allowUnknown: false
  })
  return validData
}

// ============================================================
// === Create & Find Operations ===
// ============================================================

/**
 * Tạo session mới
 */
const createNew = async (
  data: CreateSessionInput
): Promise<SessionDocument | null> => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdSession = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .insertOne(validData)

    return (await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .findOne({ _id: createdSession.insertedId })) as SessionDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm session theo sessionId (chỉ active và chưa hết hạn)
 */
const findBySessionId = async (
  sessionId: string
): Promise<SessionDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .findOne({
        sessionId: sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      })
    return result as SessionDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm session theo sessionId (bất kể trạng thái)
 */
const findBySessionIdAny = async (
  sessionId: string
): Promise<SessionDocument | null> => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .findOne({ sessionId: sessionId })
    return result as SessionDocument | null
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm tất cả session của user (chỉ active và chưa hết hạn)
 */
const findByUserId = async (userId: string): Promise<SessionDocument[]> => {
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
    return result as SessionDocument[]
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Tìm tất cả session của user (bao gồm cả inactive và hết hạn) - Dành cho Admin
 */
const findAllSessionsByUserId = async (
  userId: string
): Promise<SessionDocument[]> => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray()
    return result as SessionDocument[]
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Đếm sessions theo userId cho overview table
 */
const getSessionsSummaryByUserId = async (
  userId: string
): Promise<SessionsSummary> => {
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

    return (
      (result[0] as SessionsSummary) || { totalSessions: 0, activeSessions: 0 }
    )
  } catch (error) {
    throw new Error(String(error))
  }
}

// ============================================================
// === Session Management Operations ===
// ============================================================

/**
 * Vô hiệu hóa session (revoke)
 */
const revokeSession = async (sessionId: string): Promise<UpdateResult> => {
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
    throw new Error(String(error))
  }
}

/**
 * Vô hiệu hóa tất cả session của user
 */
const revokeAllUserSessions = async (userId: string): Promise<UpdateResult> => {
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
    throw new Error(String(error))
  }
}

/**
 * Đánh dấu logout (soft delete) - Giữ session để tracking
 */
const logoutSession = async (sessionId: string): Promise<UpdateResult> => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .updateOne(
        { sessionId: sessionId },
        {
          $set: {
            isActive: false,
            logoutAt: new Date(),
            updatedAt: Date.now()
          }
        }
      )
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

// ============================================================
// === Cleanup Operations ===
// ============================================================

/**
 * Xóa session (hard delete) - Chỉ dùng cho cleanup cron job
 */
const deleteSession = async (sessionId: string): Promise<DeleteResult> => {
  try {
    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .deleteOne({ sessionId: sessionId })
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

/**
 * Cleanup sessions cũ (cron job) - Xóa sessions hết hạn và đã logout > 90 ngày
 */
const cleanupExpiredSessions = async (
  retentionDays: number = 90
): Promise<DeleteResult> => {
  try {
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() - retentionDays)

    const result = await GET_DB()
      .collection(SESSION_COLLECTION_NAME)
      .deleteMany({
        $or: [
          // Sessions đã hết hạn và cũ hơn retention period
          {
            expiresAt: { $lt: retentionDate }
          },
          // Sessions đã logout và cũ hơn retention period
          {
            isActive: false,
            logoutAt: { $lt: retentionDate, $ne: null }
          }
        ]
      })
    return result
  } catch (error) {
    throw new Error(String(error))
  }
}

// ============================================================
// === Export ===
// ============================================================

export const sessionModel = {
  SESSION_COLLECTION_NAME,
  SESSION_COLLECTION_SCHEMA,
  createNew,
  findBySessionId,
  findBySessionIdAny,
  findByUserId,
  findAllSessionsByUserId,
  getSessionsSummaryByUserId,
  revokeSession,
  revokeAllUserSessions,
  logoutSession,
  deleteSession,
  cleanupExpiredSessions
}
