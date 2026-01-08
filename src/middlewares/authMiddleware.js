import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { JwtProvider } from '~/providers/JwtProvider'
import { userModel } from '~/models/userModel'
import { sessionModel } from '~/models/sessionModel'

// Middleware xác thực JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Lấy token từ cookie trước, nếu không có thì lấy từ header Authorization (để tương thích)
    let token = req.cookies?.accessToken

    if (!token) {
      const authHeader = req.headers?.authorization
      token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
    }

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Vui lòng đăng nhập để tiếp tục')
    }

    // Verify token
    const decoded = JwtProvider.verifyAccessToken(token)

    // Gán thông tin user vào request để sử dụng ở middleware tiếp theo
    req.jwtDecoded = decoded

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(StatusCodes.UNAUTHORIZED, 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'))
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(StatusCodes.GONE, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'))
    } else {
      next(error)
    }
  }
}

// Middleware kiểm tra quyền admin
const verifyAdmin = async (req, res, next) => {
  try {
    if (req.jwtDecoded?.role !== 'admin') {
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

// Middleware kiểm tra quyền user (chỉ được truy cập thông tin của chính mình hoặc admin)
const verifyUserOwnership = async (req, res, next) => {
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

// Middleware kiểm tra tài khoản có bị khóa hay không (cho các tính năng đặc biệt)
const verifyActiveUser = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded?._id

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Vui lòng đăng nhập')
    }

    // Kiểm tra trạng thái active của user
    const user = await userModel.findOneById(userId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tài khoản không tồn tại. Vui lòng đăng ký tài khoản mới.')
    }

    if (!user.isActive) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Tài khoản chưa được kích hoạt. Vui lòng liên hệ admin để kích hoạt tài khoản.'
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Middleware kiểm tra session có còn active không (dùng cho revoke)
const verifySession = async (req, res, next) => {
  try {
    const sessionId = req.jwtDecoded?.sessionId

    // Nếu không có sessionId trong token, skip kiểm tra (backward compatibility)
    if (!sessionId) {
      return next()
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
    if (activeSession.userId !== req.jwtDecoded._id) {
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

// Middleware đặc biệt cho logout - chỉ cần decode Refresh Token để lấy sessionId
// RT có thời gian sống lâu (7 ngày) và luôn chứa sessionId
// QUAN TRỌNG: Vẫn verify signature để tránh JWT giả mạo
const verifyTokenForLogout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken

    if (refreshToken) {
      try {
        // Thử verify RT bình thường (chưa hết hạn)
        const decodedRT = JwtProvider.verifyRefreshToken(refreshToken)
        req.jwtDecoded = {
          _id: decodedRT._id,
          sessionId: decodedRT.sessionId
        }
      } catch (error) {
        // Nếu RT hết hạn, verify nhưng bỏ qua expiration
        // VẪN VERIFY SIGNATURE để tránh token giả mạo
        if (error.name === 'TokenExpiredError') {
          const decodedRT = JwtProvider.verifyRefreshTokenIgnoreExpiration(
            refreshToken
          )
          req.jwtDecoded = {
            _id: decodedRT._id,
            sessionId: decodedRT.sessionId
          }
        } else {
          // Token không hợp lệ (signature sai, format sai, etc.)
          req.jwtDecoded = {}
        }
      }
    } else {
      // Không có RT, gán object rỗng
      req.jwtDecoded = {}
    }

    // Luôn cho phép tiếp tục để xóa cookies
    next()
  } catch {
    // Ngay cả khi có lỗi, vẫn cho phép tiếp tục để xóa cookies
    req.jwtDecoded = {}
    next()
  }
}

export const authMiddleware = {
  verifyToken,
  verifyAdmin,
  verifyUserOwnership,
  verifyActiveUser,
  verifySession,
  verifyTokenForLogout
}
