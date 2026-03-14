/**
 * Auth Middleware
 * Middleware xác thực và phân quyền người dùng
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider.js'
import ApiError from '~/utils/ApiError.js'
import { userModel } from '~/models/userModel.js'
import { sessionModel } from '~/models/sessionModel.js'
import type { AccessTokenPayload } from '~/types/jwt.types.js'

/**
 * Middleware xác thực access token
 * Giải mã token và lưu thông tin vào req.jwtDecoded
 * Hỗ trợ lấy token từ cookie hoặc header Authorization
 */
const verifyToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Lấy token từ cookie trước, nếu không có thì lấy từ header Authorization
    let token = req.cookies?.accessToken as string | undefined

    if (!token) {
      const authHeader = req.headers?.authorization
      token = authHeader?.split(' ')[1] // Bearer TOKEN
    }

    if (!token) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Vui lòng đăng nhập để tiếp tục'
      )
    }

    // Verify token
    const decoded = JwtProvider.verifyAccessToken(token)

    // Gán thông tin user vào request để sử dụng ở middleware tiếp theo
    req.jwtDecoded = decoded as AccessTokenPayload

    next()
  } catch (error) {
    if ((error as Error).name === 'JsonWebTokenError') {
      next(
        new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
        )
      )
    } else if ((error as Error).name === 'TokenExpiredError') {
      next(
        new ApiError(
          StatusCodes.GONE,
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        )
      )
    } else {
      next(error)
    }
  }
}

/**
 * Middleware kiểm tra quyền admin
 * Yêu cầu đã qua verifyToken
 */
import { ROLES } from '~/constants/rbac.js'

// ...

const verifyAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.jwtDecoded?.role !== ROLES.ADMIN) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn cần quyền quản trị viên để thực hiện chức năng này'
      )
    }
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware kiểm tra quyền sở hữu resource
 * User chỉ được thao tác với resource của chính mình, admin có toàn quyền
 */
const verifyUserOwnership = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params?.id
    const currentUserId = req.jwtDecoded?._id
    const currentUserRole = req.jwtDecoded?.role

    // Admin có thể truy cập thông tin của bất kỳ user nào
    // User chỉ có thể truy cập thông tin của chính mình
    if (currentUserRole !== 'admin' && currentUserId !== userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không có quyền truy cập thông tin này'
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}

import { UserStatus } from '@prisma/client'

/**
 * Middleware kiểm tra tài khoản có đang hoạt động
 * Yêu cầu đã qua verifyToken
 */
const verifyActiveUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.jwtDecoded?._id

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Vui lòng đăng nhập')
    }

    // Kiểm tra trạng thái active của user
    const user = await userModel.findOneById(parseInt(userId, 10))
    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Tài khoản không tồn tại. Vui lòng đăng ký tài khoản mới.'
      )
    }

    if (user.status !== UserStatus.active) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Tài khoản chưa được kích hoạt hoặc đã bị khóa. Vui lòng liên hệ admin để biết thêm chi tiết.'
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware kiểm tra session hợp lệ
 * Yêu cầu đã qua verifyToken
 */
const verifySession = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.jwtDecoded?.sessionId

    // Nếu không có sessionId trong token, skip kiểm tra (backward compatibility)
    if (!sessionId) {
      next()

      return
    }

    // Kiểm tra session có còn active không
    const activeSession = await sessionModel.findBySessionId(sessionId)

    if (!activeSession) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Phiên đăng nhập đã bị thu hồi hoặc hết hạn. Vui lòng đăng nhập lại.'
      )
    }

    // Kiểm tra session có khớp với user hiện tại không
    if (String(activeSession.userId) !== req.jwtDecoded?._id) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Phiên đăng nhập không hợp lệ'
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware đặc biệt cho logout
 * Dùng Refresh Token từ cookie để lấy sessionId
 * RT có thời gian sống lâu (7 ngày) và luôn chứa sessionId
 * QUAN TRỌNG: Vẫn verify signature để tránh JWT giả mạo
 */
const verifyTokenForLogout = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined

    if (refreshToken) {
      try {
        // Thử verify RT bình thường (chưa hết hạn)
        const decodedRT = JwtProvider.verifyRefreshToken(refreshToken)
        req.jwtDecoded = {
          _id: decodedRT._id,
          sessionId: decodedRT.sessionId
        } as AccessTokenPayload
      } catch (error) {
        // Nếu RT hết hạn, verify nhưng bỏ qua expiration
        // VẪN VERIFY SIGNATURE để tránh token giả mạo
        if ((error as Error).name === 'TokenExpiredError') {
          const decodedRT =
            JwtProvider.verifyRefreshTokenIgnoreExpiration(refreshToken)
          req.jwtDecoded = {
            _id: decodedRT._id,
            sessionId: decodedRT.sessionId
          } as AccessTokenPayload
        } else {
          // Token không hợp lệ (signature sai, format sai, etc.)
          req.jwtDecoded = {} as AccessTokenPayload
        }
      }
    } else {
      // Không có RT, gán object rỗng
      req.jwtDecoded = {} as AccessTokenPayload
    }

    // Luôn cho phép tiếp tục để xóa cookies
    next()
  } catch {
    // Ngay cả khi có lỗi, vẫn cho phép tiếp tục để xóa cookies
    req.jwtDecoded = {} as AccessTokenPayload
    next()
  }
}

import { permissionModel } from '~/models/permissionModel.js'

/**
 * Middleware kiểm tra permission
 * Yêu cầu đã qua verifyToken
 * Sử dụng: requirePermission('manage_products')
 */
const requirePermission = (permissionName: string) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.jwtDecoded?._id

      if (!userId) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Vui lòng đăng nhập')
      }

      // Admin luôn có tất cả permissions
      if (req.jwtDecoded?.role === ROLES.ADMIN) {
        next()

        return
      }

      // Kiểm tra user có permission hay không
      const hasPermission = await permissionModel.checkUserPermission(
        parseInt(userId, 10),
        permissionName
      )

      if (!hasPermission) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          `Bạn không có quyền "${permissionName}" để thực hiện hành động này`
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware kiểm tra có ít nhất 1 trong các permissions (Optimized - single query)
 * Sử dụng: requireAnyPermission(['manage_products', 'view_analytics'])
 */
const requireAnyPermission = (permissionNames: string[]) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.jwtDecoded?._id

      if (!userId) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Vui lòng đăng nhập')
      }

      // Admin luôn có tất cả permissions
      if (req.jwtDecoded?.role === ROLES.ADMIN) {
        next()

        return
      }

      // Kiểm tra user có ít nhất 1 permission (single query)
      const hasAnyPermission = await permissionModel.checkUserAnyPermission(
        parseInt(userId, 10),
        permissionNames
      )

      if (!hasAnyPermission) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          `Bạn cần có ít nhất 1 trong các quyền: ${permissionNames.join(', ')}`
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware kiểm tra có TẤT CẢ các permissions
 * Sử dụng: requireAllPermissions(['manage_products', 'manage_orders'])
 */
const requireAllPermissions = (permissionNames: string[]) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.jwtDecoded?._id

      if (!userId) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Vui lòng đăng nhập')
      }

      // Admin luôn có tất cả permissions
      if (req.jwtDecoded?.role === 'admin') {
        next()

        return
      }

      // Kiểm tra user có tất cả permissions
      const hasAllPermissions = await permissionModel.checkUserAllPermissions(
        parseInt(userId, 10),
        permissionNames
      )

      if (!hasAllPermissions) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          `Bạn cần có tất cả các quyền sau: ${permissionNames.join(', ')}`
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

export const authMiddleware = {
  verifyToken,
  verifyAdmin,
  verifyUserOwnership,
  verifyActiveUser,
  verifySession,
  verifyTokenForLogout,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions
}
