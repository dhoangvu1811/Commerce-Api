/**
 * Session type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps } from './common.types.js'

/**
 * Session document trong MongoDB
 */
export interface Session extends Timestamps {
  _id?: ObjectId
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
