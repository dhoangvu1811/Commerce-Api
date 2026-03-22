/**
 * JWT Provider
 * Xử lý việc tạo và xác thực JSON Web Tokens
 */

import jwt from 'jsonwebtoken'
import type { SignOptions, Secret } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { env } from '~/config/environment.js'
import type {
  JwtPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
  VerificationTokenPayload,
  PasswordResetTokenPayload,
  TokenUserData
} from '~/types/jwt.types.js'

/**
 * Tạo Access Token với sessionId
 * @param {TokenUserData} userData - Thông tin user
 * @param {string | null} sessionId - Session ID để tracking
 * @returns {string} Access Token
 */
const generateAccessToken = (
  userData: TokenUserData,
  sessionId: string | null = null
): string => {
  const payload: Partial<AccessTokenPayload> = {
    _id: userData._id,
    email: userData.email,
    role: userData.role
  }

  // Thêm sessionId vào payload nếu có (cho việc revoke)
  if (sessionId) {
    payload.sessionId = sessionId
  }

  return jwt.sign(
    payload,
    env.JWT_ACCESS_SECRET as Secret,
    {
      expiresIn: (env.JWT_ACCESS_EXPIRES_IN || '5m') as string
    } as SignOptions
  )
}

/**
 * Tạo Refresh Token với sessionId
 * @param {TokenUserData} userData - Thông tin user
 * @param {string} sessionId - Session ID để tracking
 * @returns {string} Refresh Token
 */
const generateRefreshToken = (
  userData: TokenUserData,
  sessionId: string
): string => {
  return jwt.sign(
    {
      _id: userData._id,
      sessionId: sessionId
    } as RefreshTokenPayload,
    env.JWT_REFRESH_SECRET as Secret,
    {
      expiresIn: (env.JWT_REFRESH_EXPIRES_IN || '7d') as string
    } as SignOptions
  )
}

/**
 * Xác thực Access Token
 * @param {string} token - Access token cần verify
 * @returns {AccessTokenPayload} Payload đã decode
 */
const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload
}

/**
 * Xác thực Access Token nhưng bỏ qua expiration (dùng cho logout)
 * Vẫn verify signature để đảm bảo token không bị giả mạo
 * @param {string} token - Access token cần verify
 * @returns {AccessTokenPayload} Payload đã decode
 */
const verifyAccessTokenIgnoreExpiration = (
  token: string
): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    ignoreExpiration: true
  }) as AccessTokenPayload
}

/**
 * Xác thực Refresh Token
 * @param {string} token - Refresh token cần verify
 * @returns {RefreshTokenPayload} Payload đã decode
 */
const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload
}

/**
 * Xác thực Refresh Token nhưng bỏ qua expiration (dùng cho logout)
 * Vẫn verify signature để đảm bảo token không bị giả mạo
 * @param {string} token - Refresh token cần verify
 * @returns {RefreshTokenPayload} Payload đã decode
 */
const verifyRefreshTokenIgnoreExpiration = (
  token: string
): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    ignoreExpiration: true
  }) as RefreshTokenPayload
}

/**
 * Decode token không verify (để debug hoặc lấy thông tin)
 * @param {string} token - Token cần decode
 * @returns {JwtPayload | null} Payload đã decode hoặc null
 */
const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token) as JwtPayload | null
}

/**
 * Tạo verification token cho xác minh email
 * @param {string} email - Email cần xác minh
 * @returns {string} Verification Token
 */
const generateVerificationToken = (email: string): string => {
  const payload: VerificationTokenPayload = {
    email,
    type: 'email_verification',
    uuid: uuidv4()
  }

  // Token có hiệu lực 24 giờ
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '24h' })
}

/**
 * Xác minh verification token
 * @param {string} token - Token cần xác minh
 * @returns {VerificationTokenPayload} Payload đã decode
 * @throws {ApiError} Nếu token không hợp lệ hoặc hết hạn
 */
const verifyVerificationToken = (token: string): VerificationTokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET
    ) as VerificationTokenPayload

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

/**
 * Tạo password reset token
 * @param {string} email - Email cần reset mật khẩu
 * @returns {string} Password Reset Token
 */
const generatePasswordResetToken = (email: string): string => {
  const payload: PasswordResetTokenPayload = {
    email,
    type: 'password_reset',
    uuid: uuidv4()
  }

  // Token reset password có hiệu lực ngắn để giảm rủi ro lộ link
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' })
}

/**
 * Xác minh password reset token
 * @param {string} token - Token cần xác minh
 * @returns {PasswordResetTokenPayload} Payload đã decode
 * @throws {ApiError} Nếu token không hợp lệ hoặc hết hạn
 */
const verifyPasswordResetToken = (token: string): PasswordResetTokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET
    ) as PasswordResetTokenPayload

    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid token type')
    }

    return decoded
  } catch {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'
    )
  }
}

/**
 * JWT Provider object chứa các methods
 */
export const JwtProvider = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyAccessTokenIgnoreExpiration,
  verifyRefreshToken,
  verifyRefreshTokenIgnoreExpiration,
  decodeToken,
  generateVerificationToken,
  verifyVerificationToken,
  generatePasswordResetToken,
  verifyPasswordResetToken
}
