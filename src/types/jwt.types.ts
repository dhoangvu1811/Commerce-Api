/**
 * JWT Provider type definitions
 */

import type { JwtPayload } from 'jsonwebtoken'

/**
 * Payload cho Access Token
 */
export interface AccessTokenPayload extends JwtPayload {
  _id: string
  email: string
  role: string
  sessionId?: string
}

/**
 * Payload cho Refresh Token
 */
export interface RefreshTokenPayload extends JwtPayload {
  _id: string
  sessionId: string
}

/**
 * Payload cho Verification Token (xác minh email)
 */
export interface VerificationTokenPayload extends JwtPayload {
  email: string
  type: 'email_verification'
  uuid: string
}

/**
 * User data cần thiết để tạo token
 */
export interface TokenUserData {
  _id: string
  email: string
  role: string
}

/**
 * JWT Provider interface
 */
export interface IJwtProvider {
  generateAccessToken: (userData: TokenUserData, sessionId?: string | null) => string
  generateRefreshToken: (userData: TokenUserData, sessionId: string) => string
  verifyAccessToken: (token: string) => AccessTokenPayload
  verifyRefreshToken: (token: string) => RefreshTokenPayload
  verifyRefreshTokenIgnoreExpiration: (token: string) => RefreshTokenPayload
  decodeToken: (token: string) => JwtPayload | null
  generateVerificationToken: (email: string) => string
  verifyVerificationToken: (token: string) => VerificationTokenPayload
}
