/**
 * Session type definitions
 */

import type { Timestamps } from './common.types.js'

/**
 * Session entity (PostgreSQL/Prisma)
 * Note: _id is string for backward compatibility with API responses
 */
export interface Session extends Timestamps {
  _id?: string | number
  sessionId: string
  userId: string
  refreshToken: string
  deviceInfo: string
  ipAddress: string
  expiresAt: Date
  isActive: boolean
  loggedOutAt?: Date | null
}

/**
 * Input tạo session mới
 */
export interface CreateSessionInput {
  sessionId: string
  userId: string
  refreshToken: string
  deviceInfo: string
  ipAddress: string
  expiresAt: Date
}

/**
 * Session summary cho user overview
 */
export interface SessionSummary {
  totalSessions: number
  activeSessions: number
  lastActiveAt: Date | null
}

/**
 * Session status
 */
export type SessionStatus = 'active' | 'logout' | 'revoked' | 'expired'

/**
 * Safe session info (without refreshToken)
 */
export interface SafeSessionInfo {
  sessionId: string
  deviceInfo: string
  ipAddress: string
  createdAt: Date
  expiresAt: Date
  logoutAt?: Date | null
  isActive: boolean
  isExpired: boolean
  status: SessionStatus
}

/**
 * Safe session for current user
 */
export interface CurrentUserSession {
  sessionId: string
  deviceInfo: string
  ipAddress: string
  createdAt: Date
  expiresAt: Date
  isActive: boolean
  isCurrent: boolean
}

/**
 * Sessions summary cho service
 */
export interface SessionsSummaryInfo {
  active: number
  revoked: number
  expired: number
  logout: number
}

/**
 * Get user sessions response
 */
export interface GetUserSessionsResponse {
  userId: string
  sessions: SafeSessionInfo[]
  total: number
  summary: SessionsSummaryInfo
}

/**
 * Get current user sessions response
 */
export interface GetCurrentUserSessionsResponse {
  sessions: CurrentUserSession[]
  total: number
}

/**
 * User with session summary for overview
 */
export interface UserWithSessionSummary {
  _id: unknown
  name: string
  phone: string
  email: string
  isActive: boolean
  emailVerified: boolean
  avatar: string
  status: string
  totalSessions: number
  activeSessions: number
  lastLogin: Date | null
}

/**
 * Revoke session response
 */
export interface RevokeSessionResponse {
  sessionId: string
  message: string
}

/**
 * Revoke all sessions response
 */
export interface RevokeAllSessionsResponse {
  userId: string
  revokedSessions: number
  message: string
}
