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

    // Revoke session
    const result = await sessionModel.revokeSession(sessionId)

    if (result.modifiedCount === 0) {
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
      message: `Đã thu hồi ${result.modifiedCount} phiên đăng nhập. User sẽ bị logout trong vòng 5 phút`
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
      const hasLogout = !!session.logoutAt

      // Xác định trạng thái session
      let status = 'active'
      if (hasLogout) {
        status = 'logout' // User tự logout
      } else if (!session.isActive) {
        status = 'revoked' // Admin revoke hoặc bị thu hồi
      } else if (isExpired) {
        status = 'expired' // Hết hạn tự nhiên
      }

      return {
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        logoutAt: session.logoutAt, // Thời điểm logout (nếu có)
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

// User tự revoke session của chính mình
const revokeMySession = async (userId, sessionId) => {
  try {
    // Tìm session bất kể trạng thái để verify tồn tại
    const session = await sessionModel.findBySessionIdAny(sessionId)
    if (!session) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Không tìm thấy phiên đăng nhập'
      )
    }

    // Kiểm tra session có thuộc về user hiện tại không
    if (session.userId !== userId) {
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

    // Revoke session
    const result = await sessionModel.revokeSession(sessionId)

    if (result.modifiedCount === 0) {
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
