/**
 * Session Model - Prisma Version
 * Quản lý phiên đăng nhập (refresh tokens) của người dùng
 */

import { prisma } from '~/config/prisma.js'
import type { Session } from '@prisma/client'

/** Session type export từ Prisma */
export type { Session }

/** Kết quả aggregation cho session summary */
export interface SessionsSummary {
  totalSessions: number
  activeSessions: number
}

/** Input tạo session mới */
export interface CreateSessionInput {
  sessionId: string
  userId: number
  refreshToken: string
  deviceInfo?: string | null
  ipAddress?: string | null
  expiresAt: Date
}

/**
 * Tạo session mới
 */
const createNew = async (data: CreateSessionInput): Promise<Session> => {
  const session = await prisma.session.create({
    data: {
      sessionId: data.sessionId,
      userId: data.userId,
      refreshToken: data.refreshToken,
      deviceInfo: data.deviceInfo || null,
      ipAddress: data.ipAddress || null,
      expiresAt: data.expiresAt,
      isActive: true
    }
  })

  return session
}

/**
 * Tìm session theo sessionId (chỉ active và chưa hết hạn)
 */
const findBySessionId = async (sessionId: string): Promise<Session | null> => {
  const session = await prisma.session.findFirst({
    where: {
      sessionId: sessionId,
      isActive: true,
      expiresAt: { gt: new Date() }
    }
  })

  return session
}

/**
 * Tìm session theo sessionId (bất kể trạng thái)
 */
const findBySessionIdAny = async (sessionId: string): Promise<Session | null> => {
  const session = await prisma.session.findUnique({
    where: { sessionId: sessionId }
  })

  return session
}

/**
 * Tìm tất cả session của user (chỉ active và chưa hết hạn)
 */
const findByUserId = async (userId: number): Promise<Session[]> => {
  const sessions = await prisma.session.findMany({
    where: {
      userId: userId,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  })

  return sessions
}

/**
 * Tìm tất cả session của user (bao gồm cả inactive và hết hạn) - Dành cho Admin
 */
const findAllSessionsByUserId = async (userId: number): Promise<Session[]> => {
  const sessions = await prisma.session.findMany({
    where: { userId: userId },
    orderBy: { createdAt: 'desc' }
  })

  return sessions
}

/**
 * Đếm sessions theo userId cho overview table
 */
const getSessionsSummaryByUserId = async (userId: number): Promise<SessionsSummary> => {
  const now = new Date()

  const [totalSessions, activeSessions] = await Promise.all([
    prisma.session.count({ where: { userId } }),
    prisma.session.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now }
      }
    })
  ])

  return { totalSessions, activeSessions }
}

/**
 * Vô hiệu hóa session (revoke)
 */
const revokeSession = async (sessionId: string): Promise<Session | null> => {
  try {
    const session = await prisma.session.update({
      where: { sessionId },
      data: { isActive: false }
    })

    return session
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Session không tồn tại
    }
    // Re-throw other errors (validation, constraint violations, etc.)
    throw error
  }
}

/**
 * Vô hiệu hóa tất cả session của user
 */
const revokeAllUserSessions = async (userId: number): Promise<{ count: number }> => {
  const result = await prisma.session.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false }
  })

  return { count: result.count }
}

/**
 * Đánh dấu logout (soft delete) - Giữ session để tracking
 */
const logoutSession = async (sessionId: string): Promise<Session | null> => {
  try {
    const session = await prisma.session.update({
      where: { sessionId },
      data: {
        isActive: false,
        logoutAt: new Date()
      }
    })

    return session
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Session không tồn tại
    }
    // Re-throw other errors (validation, constraint violations, etc.)
    throw error
  }
}

/**
 * Xóa session (hard delete) - Chỉ dùng cho cleanup cron job
 */
const deleteSession = async (sessionId: string): Promise<Session | null> => {
  try {
    const session = await prisma.session.delete({
      where: { sessionId }
    })

    return session
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Session không tồn tại
    }
    // Re-throw other errors (constraint violations, etc.)
    throw error
  }
}

/**
 * Cleanup sessions cũ (cron job) - Xóa sessions hết hạn và đã logout > 90 ngày
 */
const cleanupExpiredSessions = async (retentionDays: number = 90): Promise<{ count: number }> => {
  // Safety check: Minimum retention days
  if (retentionDays < 7) {
    throw new Error('Retention days must be at least 7 days')
  }

  const retentionDate = new Date()
  retentionDate.setDate(retentionDate.getDate() - retentionDays)

  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        // Sessions đã hết hạn và cũ hơn retention period
        { expiresAt: { lt: retentionDate } },
        // Sessions đã logout và cũ hơn retention period
        {
          isActive: false,
          logoutAt: { lt: retentionDate, not: null }
        }
      ]
    }
  })

  return { count: result.count }
}

export const sessionModel = {
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
