/**
 * User type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps } from './common.types.js'

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
 * Kết quả lấy danh sách users
 */
export interface GetUsersResult {
  users: UserResponse[]
  pagination: {
    page: number
    itemsPerPage: number
    totalUsers: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
