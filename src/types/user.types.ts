/**
 * User type definitions
 */

import type { Timestamps, PaginationInfo } from './common.types.js'

import type {
  Gender as PrismaGender,
  AccountType as PrismaAccountType
} from '@prisma/client'
import {
  UserStatus
} from '@prisma/client'

/**
 * User roles
 */
export type UserRole = 'admin' | 'user'

/**
 * Gender options (re-export from Prisma)
 */
export type Gender = PrismaGender

/**
 * Account type (re-export from Prisma)
 */
export type AccountType = PrismaAccountType

/**
 * User status (re-export from Prisma)
 */
export { UserStatus }

/**
 * User entity (PostgreSQL/Prisma)
 * Matches Prisma generated User type with some additions for API compatibility
 */
export interface User extends Timestamps {
  // Prisma fields
  id: number
  name: string
  email: string
  password: string
  phoneNumber?: string | null // Prisma field name
  address?: string | null
  avatar?: string | null
  dateOfBirth?: Date | null
  gender?: Gender | null
  roleId: number // Prisma uses roleId, not role
  emailVerified: boolean
  typeAccount: AccountType
  lastLogin?: Date | null
  activationToken?: string | null
  googleId?: string | null
  status: UserStatus | null

  // Backward compatibility aliases (for API responses)
  _id?: string | number // String for API, number for DB
  role?: UserRole // Resolved from roleId
  isActive?: boolean // Derived from status === 'active'
}

/**
 * User response - không bao gồm password
 */
export type UserResponse = Omit<User, 'password'>

/**
 * Public user info - chỉ các trường công khai
 */
export interface PublicUser {
  _id?: string | number
  email: string
  userName?: string
  displayName?: string
  avatar: string
  role: UserRole
  status: UserStatus
  createdAt?: Date
  updatedAt?: Date | null
}

/**
 * Input cho đăng ký user
 */
export interface RegisterInput {
  name: string
  email: string
  password: string
  confirmPassword?: string
  phoneNumber?: string
  address?: string
  dateOfBirth?: string | Date | null
  gender?: Gender
}

/**
 * Login context - determines which platform the user is logging into
 */
export type LoginContext = 'admin' | 'client'

/**
 * Input cho đăng nhập
 */
export interface LoginInput {
  email: string
  password: string
  loginContext?: LoginContext
}

/**
 * Kết quả đăng nhập
 */
export interface LoginResult {
  user: UserResponse
  accessToken: string
  refreshToken: string
  sessionId: string
}

/**
 * Input cập nhật user
 */
export interface UpdateUserInput {
  name?: string
  phoneNumber?: string
  address?: string
  avatar?: string
  dateOfBirth?: Date | null
  gender?: Gender
}

/**
 * Input cập nhật user bởi admin
 */
export interface UpdateUserByAdminInput extends UpdateUserInput {
  email?: string
  role?: UserRole
  roleId?: number // Added for refactor
  status?: UserStatus
  emailVerified?: boolean
}

/**
 * Input đổi mật khẩu
 */
export interface UpdatePasswordInput {
  currentPassword?: string
  newPassword: string
  confirmNewPassword: string
}

/**
 * Input data để tạo user mới - extends từ RegisterInput với các field bổ sung
 */
export interface CreateUserInput extends Omit<
  RegisterInput,
  'confirmPassword'
> {
  password: string // password đã được hash
  avatar?: string
  role?: UserRole
  status?: UserStatus
  emailVerified?: boolean
  typeAccount?: AccountType
}

/**
 * Input data để update user - extends từ UpdateUserByAdminInput với các field bổ sung
 */
export interface UpdateUserInputExtended extends UpdateUserByAdminInput {
  password?: string
  typeAccount?: AccountType
  updatedAt?: Date
}

/**
 * Generic paginated result cho users
 */
export interface PaginatedUsersResult<T = UserResponse> {
  users: T[]
  pagination: PaginationInfo
}

/**
 * Kết quả lấy danh sách users (alias cho backward compatibility)
 */
export type GetUsersResult = PaginatedUsersResult<UserResponse>

/**
 * Kết quả phân trang users từ model (bao gồm password)
 */
export type PaginatedUsersModelResult<T = UserResponse> =
  PaginatedUsersResult<T>

/**
 * Query filter for users
 */
export interface UserQueryFilter {
  search?: string
  role?: UserRole
  status?: UserStatus
  sort?: string
}

/**
 * User filter (legacy - kept for backward compatibility)
 * Note: Prisma uses different filter structure
 */
export interface UserMongoFilter {
  $or?: Array<
    | { name: { $regex: string; $options: string } }
    | { email: { $regex: string; $options: string } }
  >
  role?: UserRole
  status?: UserStatus
}

/**
 * Refresh token result
 */
export interface RefreshTokenResult {
  accessToken: string
}

/**
 * Email verification result
 */
export interface EmailVerificationResult {
  email: string
  message: string
  expiresIn: string
}

/**
 * Verify account result
 */
export interface VerifyAccountResult {
  message: string
  user: {
    _id: string | number
    email: string
    name: string
    emailVerified: boolean
    status: UserStatus
  }
}
