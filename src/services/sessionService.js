import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { sessionModel } from '~/models/sessionModel'
import { userModel } from '~/models/userModel'
import { userService } from './userService'

/**
 * Session Service - Xử lý logic business cho session management
 */

// Revoke một session cụ thể
const revokeUserSession = async (sessionId) => {
  try {
    // Tìm session để verify
    const session = await sessionModel.findBySessionId(sessionId)
    if (!session) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Không tìm thấy phiên đăng nhập'
      )
    }

    // Revoke session
    const result = await sessionModel.revokeSession(sessionId)

    if (result.modifiedCount === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Không thể thu hồi phiên đăng nhập'
      )
    }

    return {
      sessionId,
      message: 'User sẽ bị logout trong vòng 5 phút (khi AccessToken hết hạn)'
    }
  } catch (error) {
    throw error
  }
}

// Revoke tất cả sessions của một user
const revokeAllUserSessions = async (userId) => {
  try {
    // Verify user tồn tại
    const user = await userModel.findOneById(userId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Revoke tất cả sessions của user
    const result = await sessionModel.revokeAllUserSessions(userId)

    return {
      userId,
      revokedSessions: result.modifiedCount,
      message: 'User sẽ bị logout trong vòng 5 phút (khi AccessToken hết hạn)'
    }
  } catch (error) {
    throw error
  }
}

// Lấy danh sách sessions với thông tin chi tiết
const getUserSessions = async (userId) => {
  try {
    // Verify user tồn tại
    const user = await userModel.findOneById(userId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Lấy tất cả sessions của user (bao gồm cả inactive và hết hạn) để tracking
    const sessions = await sessionModel.findAllSessionsByUserId(userId)

    // Loại bỏ refreshToken khỏi response vì lý do bảo mật và thêm thông tin tracking
    const safeSessions = sessions.map((session) => {
      const now = new Date()
      const isExpired = session.expiresAt < now

      return {
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        isExpired: isExpired,
        status: !session.isActive ? 'revoked' : isExpired ? 'expired' : 'active'
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

    return {
      userId,
      sessions: safeSessions,
      total: safeSessions.length,
      summary: {
        active: activeSessions,
        revoked: revokedSessions,
        expired: expiredSessions
      }
    }
  } catch (error) {
    throw error
  }
}

// Lấy sessions của user hiện tại
const getCurrentUserSessions = async (userId, currentSessionId = null) => {
  try {
    // Lấy tất cả sessions active của user hiện tại
    const sessions = await sessionModel.findByUserId(userId)

    // Loại bỏ refreshToken khỏi response và highlight current session
    const safeSessions = sessions.map((session) => ({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
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

// Lấy users với session summary (cho overview table)
const getUsersWithSessionSummary = async (page, itemsPerPage, queryFilter) => {
  try {
    // Lấy danh sách users
    const usersResult = await userService.getUsers(
      page,
      itemsPerPage,
      queryFilter
    )

    // Lấy session summary cho từng user
    const usersWithSessions = await Promise.all(
      usersResult.users.map(async (user) => {
        const sessionSummary = await sessionModel.getSessionsSummaryByUserId(
          user._id.toString()
        )

        return {
          _id: user._id,
          name: user.name,
          phone: user.phone || '',
          email: user.email,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          avatar: user.avatar || '',
          status: user.isActive ? 'Hoạt động' : 'Không hoạt động',
          totalSessions: sessionSummary.totalSessions,
          activeSessions: sessionSummary.activeSessions,
          lastLogin: user.lastLogin
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

export const sessionService = {
  revokeUserSession,
  revokeAllUserSessions,
  getUserSessions,
  getCurrentUserSessions,
  getUsersWithSessionSummary
}
