/**
 * JWT Provider type definitions
 */

import type { JwtPayload as JwtPayloadBase } from 'jsonwebtoken'

// Re-export JwtPayload cho sử dụng bên ngoài
export type JwtPayload = JwtPayloadBase

/**
 * Payload cho Access Token
 */
export interface AccessTokenPayload extends JwtPayloadBase {
  _id: string
  email: string
  role: string
  sessionId?: string
}

/**
 * Payload cho Refresh Token
 */
export interface RefreshTokenPayload extends JwtPayloadBase {
  _id: string
  sessionId: string
}

/**
 * Payload cho Verification Token (xác minh email)
 */
export interface VerificationTokenPayload extends JwtPayloadBase {
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
 * Alias cho TokenUserData (sử dụng trong JwtProvider)
 */
export type UserDataForToken = TokenUserData

/**
 * JWT Provider interface
 */
export interface IJwtProvider {
  generateAccessToken: (
    userData: TokenUserData,
    sessionId?: string | null
  ) => string
  generateRefreshToken: (userData: TokenUserData, sessionId: string) => string
  verifyAccessToken: (token: string) => AccessTokenPayload
  verifyRefreshToken: (token: string) => RefreshTokenPayload
  verifyRefreshTokenIgnoreExpiration: (token: string) => RefreshTokenPayload
  decodeToken: (token: string) => JwtPayload | null
  generateVerificationToken: (email: string) => string
  verifyVerificationToken: (token: string) => VerificationTokenPayload
}
