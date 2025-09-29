import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { env } from '~/config/environment'

// Tạo Access Token với sessionId
const generateAccessToken = (userData, sessionId = null) => {
  const payload = {
    _id: userData._id,
    email: userData.email,
    role: userData.role
  }

  // Thêm sessionId vào payload nếu có (cho việc revoke)
  if (sessionId) {
    payload.sessionId = sessionId
  }

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN || '5m'
  })
}

// Tạo Refresh Token với sessionId
const generateRefreshToken = (userData, sessionId) => {
  return jwt.sign(
    {
      _id: userData._id,
      sessionId: sessionId // Thêm sessionId vào metadata
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )
}

// Verify Access Token
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET)
}

// Verify Refresh Token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET)
}

// Decode token không verify (để debug hoặc lấy thông tin)
const decodeToken = (token) => {
  return jwt.decode(token)
}

// Tạo verification token cho xác minh email
const generateVerificationToken = (email) => {
  const payload = {
    email,
    type: 'email_verification',
    uuid: uuidv4()
  }

  // Token có hiệu lực 24 giờ
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '24h' })
}

// Xác minh verification token
const verifyVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)

    // Kiểm tra type token
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type')
    }

    return decoded
  } catch {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token xác minh không hợp lệ hoặc đã hết hạn'
    )
  }
}

export const JwtProvider = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  generateVerificationToken,
  verifyVerificationToken
}
