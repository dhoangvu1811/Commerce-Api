/**
 * User type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps, PaginationInfo } from './common.types.js'

/**
 * User roles
 */
export type UserRole = 'admin' | 'user'

/**
 * Gender options
 */
export type Gender = 'male' | 'female' | 'other' | ''

/**
 * Account type - cách user đăng ký
 */
export type AccountType = 'LOCAL' | 'GOOGLE' | 'FACEBOOK'

/**
 * Alias cho TypeAccount (backward compatibility)
 */
export type TypeAccount = AccountType

/**
 * User document trong MongoDB
 */
export interface User extends Timestamps {
  _id?: ObjectId
  name: string
  email: string
  password: string
  phone: string
  address: string
  avatar: string
  dateOfBirth: Date | null
  gender: Gender
  role: UserRole
  isActive: boolean
  emailVerified: boolean
  typeAccount: AccountType
  lastLogin: Date | null
  userName?: string
  displayName?: string
}

/**
 * User response - không bao gồm password
 */
export type UserResponse = Omit<User, 'password'>

/**
 * Public user info - chỉ các trường công khai
 */
export interface PublicUser {
  _id?: ObjectId
  email: string
  userName?: string
  displayName?: string
  avatar: string
  role: UserRole
  isActive: boolean
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
  confirmPassword: string
  phone?: string
  address?: string
  dateOfBirth?: string | Date | null
  gender?: Gender
}

/**
 * Input cho đăng nhập
 */
export interface LoginInput {
  email: string
  password: string
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
  phone?: string
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
  isActive?: boolean
  emailVerified?: boolean
}

/**
 * Input đổi mật khẩu
 */
export interface UpdatePasswordInput {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

/**
 * Input data để tạo user mới - extends từ RegisterInput với các field bổ sung
 */
export interface CreateUserInput
  extends Omit<RegisterInput, 'confirmPassword'> {
  password: string // password đã được hash
  avatar?: string
  role?: UserRole
  isActive?: boolean
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
  pagination: PaginationInfo & {
    totalUsers: number
  }
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
  isActive?: string
  sort?: string
}

/**
 * MongoDB filter for users
 */
export interface UserMongoFilter {
  $or?: Array<
    | { name: { $regex: string; $options: string } }
    | { email: { $regex: string; $options: string } }
  >
  role?: UserRole
  isActive?: boolean
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
    _id: ObjectId
    email: string
    name: string
    emailVerified: boolean
    isActive: boolean
  }
}
