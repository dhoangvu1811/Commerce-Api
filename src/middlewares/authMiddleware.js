import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { JwtProvider } from '~/providers/JwtProvider'

// Middleware xác thực JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Lấy token từ header Authorization
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Access token không tồn tại')
    }

    // Verify token
    const decoded = JwtProvider.verifyAccessToken(token)

    // Gán thông tin user vào request để sử dụng ở middleware tiếp theo
    req.jwtDecoded = decoded

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Access token không hợp lệ'))
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Access token đã hết hạn'))
    } else {
      next(error)
    }
  }
}

// Middleware kiểm tra quyền admin
const verifyAdmin = async (req, res, next) => {
  try {
    if (req.jwtDecoded.role !== 'admin') {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Bạn không có quyền truy cập chức năng này'
      )
    }
    next()
  } catch (error) {
    next(error)
  }
}

// Middleware kiểm tra quyền user (chỉ được truy cập thông tin của chính mình hoặc admin)
const verifyUserOwnership = async (req, res, next) => {
  try {
    const userId = req.params.id
    const currentUserId = req.jwtDecoded._id
    const currentUserRole = req.jwtDecoded.role

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

export const authMiddleware = {
  verifyToken,
  verifyAdmin,
  verifyUserOwnership
}
