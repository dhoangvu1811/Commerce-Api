
/**
 * Session Service - Prisma Version
 * Xử lý logic business cho session management
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { sessionModel } from '~/models/sessionModel.js'
import { userModel } from '~/models/userModel.js'
import { userService } from './userService.js'
import type { PaginationInfo } from '~/types/common.types.js'
import type {
  SessionStatus,
  SafeSessionInfo,
  CurrentUserSession,
  GetUserSessionsResponse,
  GetCurrentUserSessionsResponse,
  UserWithSessionSummary,
  RevokeSessionResponse,
  RevokeAllSessionsResponse
} from '~/types/session.types.js'

/**
 * Parse userId string to number
 */
const parseUserId = (userId: string): number => {
  const id = parseInt(userId, 10)
  if (isNaN(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID không hợp lệ')
  }

  return id
}

/**
 * Revoke một session cụ thể
 */
const revokeUserSession = async (
  sessionId: string
): Promise<RevokeSessionResponse> => {
  try {
    // Tìm session bất kể trạng thái để verify tồn tại
    const session = await sessionModel.findBySessionIdAny(sessionId)
    if (!session) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Không tìm thấy phiên đăng nhập'
      )
    }

    // Kiểm tra session đã bị revoke chưa
    if (!session.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phiên đăng nhập đã được thu hồi trước đó'
      )
    }

    // Kiểm tra session đã hết hạn chưa
    if (session.expiresAt < new Date()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Phiên đăng nhập đã hết hạn')
    }

    // Revoke session - Prisma returns Session | null
    const result = await sessionModel.revokeSession(sessionId)

    if (result === null) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Không thể thu hồi phiên đăng nhập'
      )
    }

    return {
      sessionId,
      message:
        'Thu hồi phiên đăng nhập thành công. User sẽ bị logout trong vòng 5 phút'
    }
  } catch (error) {
    throw error
  }
}

/**
 * Revoke tất cả sessions của một user
 */
const revokeAllUserSessions = async (
  userId: string
): Promise<RevokeAllSessionsResponse> => {
  try {
    const userIdNum = parseUserId(userId)

    // Verify user tồn tại
    const user = await userModel.findOneById(userIdNum)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Revoke tất cả sessions của user - Prisma returns { count }
    const result = await sessionModel.revokeAllUserSessions(userIdNum)

    return {
      userId,
      revokedSessions: result.count,
      message: `Đã thu hồi ${result.count} phiên đăng nhập. User sẽ bị logout trong vòng 5 phút`
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy danh sách sessions với thông tin chi tiết
 */
const getUserSessions = async (
  userId: string
): Promise<GetUserSessionsResponse> => {
  try {
    const userIdNum = parseUserId(userId)

    // Verify user tồn tại
    const user = await userModel.findOneById(userIdNum)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Lấy tất cả sessions của user (bao gồm cả inactive và hết hạn) để tracking
    const sessions = await sessionModel.findAllSessionsByUserId(userIdNum)

    // Loại bỏ refreshToken khỏi response vì lý do bảo mật và thêm thông tin tracking
    const safeSessions: SafeSessionInfo[] = sessions.map((session) => {
      const now = new Date()
      const isExpired = session.expiresAt < now
      const hasLogout = !!session.logoutAt

      // Xác định trạng thái session
      let status: SessionStatus = 'active'
      if (hasLogout) {
        status = 'logout' // User tự logout
      } else if (!session.isActive) {
        status = 'revoked' // Admin revoke hoặc bị thu hồi
      } else if (isExpired) {
        status = 'expired' // Hết hạn tự nhiên
      }

      return {
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo || '',
        ipAddress: session.ipAddress || '',
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        logoutAt: session.logoutAt,
        isActive: session.isActive,
        isExpired: isExpired,
        status: status
      }
    })

    // Thống kê sessions
    const activeSessions = safeSessions.filter(
      (s) => s.status === 'active'
    ).length
    const revokedSessions = safeSessions.filter(
      (s) => s.status === 'revoked'
    ).length
    const expiredSessions = safeSessions.filter(
      (s) => s.status === 'expired'
    ).length
    const logoutSessions = safeSessions.filter(
      (s) => s.status === 'logout'
    ).length

    return {
      userId,
      sessions: safeSessions,
      total: safeSessions.length,
      summary: {
        active: activeSessions,
        revoked: revokedSessions,
        expired: expiredSessions,
        logout: logoutSessions
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy sessions của user hiện tại
 */
const getCurrentUserSessions = async (
  userId: string,
  currentSessionId: string | null = null
): Promise<GetCurrentUserSessionsResponse> => {
  try {
    const userIdNum = parseUserId(userId)

    // Lấy tất cả sessions active của user hiện tại
    const sessions = await sessionModel.findByUserId(userIdNum)

    // Loại bỏ refreshToken khỏi response và highlight current session
    const safeSessions: CurrentUserSession[] = sessions.map((session) => ({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo || '',
      ipAddress: session.ipAddress || '',
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isActive: session.isActive,
      isCurrent: session.sessionId === currentSessionId
    }))

    return {
      sessions: safeSessions,
      total: safeSessions.length
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy users với session summary (cho overview table)
 */
const getUsersWithSessionSummary = async (
  page: number,
  itemsPerPage: number,
  queryFilter: Record<string, unknown>
): Promise<{ users: UserWithSessionSummary[]; pagination: PaginationInfo }> => {
  try {
    // Lấy danh sách users
    const usersResult = await userService.getUsers(
      page,
      itemsPerPage,
      queryFilter
    )

    // Lấy session summary cho từng user
    const usersWithSessions: UserWithSessionSummary[] = await Promise.all(
      usersResult.users.map(async (user) => {
        // Cast to access Prisma User fields
        const prismaUser = user as unknown as {
          id: number
          name: string
          phoneNumber?: string
          email: string
          isActive: boolean
          emailVerified: boolean
          avatar?: string
          lastLogin?: Date | null
        }

        const sessionSummary = await sessionModel.getSessionsSummaryByUserId(
          prismaUser.id
        )

        return {
          _id: prismaUser.id, // Map id to _id for backward compatibility
          name: prismaUser.name,
          phone: prismaUser.phoneNumber || '',
          email: prismaUser.email,
          isActive: prismaUser.isActive,
          emailVerified: prismaUser.emailVerified,
          avatar: prismaUser.avatar || '',
          status: prismaUser.isActive ? 'Hoạt động' : 'Không hoạt động',
          totalSessions: sessionSummary.totalSessions,
          activeSessions: sessionSummary.activeSessions,
          lastLogin: prismaUser.lastLogin ?? null
        }
      })
    )

    return {
      users: usersWithSessions,
      pagination: usersResult.pagination
    }
  } catch (error) {
    throw error
  }
}

/**
 * User tự revoke session của chính mình
 */
const revokeMySession = async (
  userId: string,
  sessionId: string
): Promise<RevokeSessionResponse> => {
  try {
    const userIdNum = parseUserId(userId)

    // Tìm session bất kể trạng thái để verify tồn tại
    const session = await sessionModel.findBySessionIdAny(sessionId)
    if (!session) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Không tìm thấy phiên đăng nhập'
      )
    }

    // Kiểm tra session có thuộc về user hiện tại không
    if (session.userId !== userIdNum) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không có quyền thu hồi phiên đăng nhập này'
      )
    }

    // Kiểm tra session đã bị revoke chưa
    if (!session.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phiên đăng nhập đã được thu hồi trước đó'
      )
    }

    // Kiểm tra session đã hết hạn chưa
    if (session.expiresAt < new Date()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Phiên đăng nhập đã hết hạn')
    }

    // Revoke session - Prisma returns Session | null
    const result = await sessionModel.revokeSession(sessionId)

    if (result === null) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Không thể thu hồi phiên đăng nhập'
      )
    }

    return {
      sessionId,
      message:
        'Thu hồi phiên đăng nhập thành công. Thiết bị này sẽ bị đăng xuất trong vòng 5 phút.'
    }
  } catch (error) {
    throw error
  }
}

export const sessionService = {
  revokeUserSession,
  revokeAllUserSessions,
  getUserSessions,
  getCurrentUserSessions,
  getUsersWithSessionSummary,
  revokeMySession
}
