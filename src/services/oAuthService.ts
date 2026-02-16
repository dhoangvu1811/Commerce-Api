
/* eslint-disable indent */
/**
 * OAuth Service - Prisma Version
 * Generic OAuth Service cho tất cả providers (Google, Facebook, v.v.)
 *
 * QUAN TRỌNG:
 * - OAuth users luôn được kích hoạt tự động (isActive = true)
 * - Local registration users cần admin kích hoạt (isActive = false)
 */

import type {
  AccountType
} from '~/models/userModel.js'
import {
  userModel,
  type User,
  UserStatus
} from '~/models/userModel.js'
import { sessionModel } from '~/models/sessionModel.js'
import { JwtProvider } from '~/providers/JwtProvider.js'
import ApiError from '~/utils/ApiError.js'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import ms from 'ms'
import { env } from '~/config/environment.js'
import type { UserResponse, UserRole } from '~/types/user.types.js'

/** OAuth provider types */
type OAuthProviderType = 'GOOGLE' | 'FACEBOOK'

/** OAuth provider config */
interface OAuthProviderConfig {
  name: OAuthProviderType
  passwordPlaceholder: string
  displayName: string
}

/** OAuth providers mapping */
interface OAuthProvidersMap {
  GOOGLE: OAuthProviderConfig
  FACEBOOK: OAuthProviderConfig
}

/** Normalized OAuth profile */
interface NormalizedOAuthProfile {
  id: string
  email: string
  displayName: string
  avatar: string
  provider: OAuthProviderType
}

/** Raw OAuth profile from passport */
interface RawOAuthProfile {
  id: string
  displayName?: string
  emails?: Array<{ value: string }>
  photos?: Array<{ value: string }>
  name?: {
    givenName?: string
    familyName?: string
  }
}

/** Auth tokens response */
interface AuthTokensResponse {
  accessToken: string
  refreshToken: string
  sessionId: string
  user: Partial<UserResponse>
}

// Default role ID for regular users
const DEFAULT_USER_ROLE_ID = 2

/**
 * Mapping các OAuth providers
 */
const OAUTH_PROVIDERS: OAuthProvidersMap = {
  GOOGLE: {
    name: 'GOOGLE',
    passwordPlaceholder: 'GOOGLE-AUTH1*#',
    displayName: 'Google Account'
  },
  FACEBOOK: {
    name: 'FACEBOOK',
    passwordPlaceholder: 'FACEBOOK-AUTH1*#',
    displayName: 'Facebook Account'
  }
}

/**
 * Chuẩn hóa profile từ các OAuth providers khác nhau
 */
const normalizeOAuthProfile = (
  profile: RawOAuthProfile,
  provider: OAuthProviderType
): NormalizedOAuthProfile => {
  const providerConfig = OAUTH_PROVIDERS[provider]
  if (!providerConfig) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Unsupported OAuth provider: ${provider}`
    )
  }

  let email: string | undefined
  let displayName: string
  let avatar: string

  switch (provider) {
    case 'GOOGLE':
      email = profile.emails?.[0]?.value
      displayName = profile.displayName || ''
      avatar = profile.photos?.[0]?.value || ''
      break

    case 'FACEBOOK':
      email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`
      displayName =
        profile.displayName ||
        `${profile.name?.givenName || ''} ${
          profile.name?.familyName || ''
        }`.trim() ||
        `${provider} User`
      avatar = profile.photos?.[0]?.value || ''
      break

    default:
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Profile normalization not implemented for: ${provider}`
      )
  }

  if (!email) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `${providerConfig.displayName} chưa cung cấp email hoặc email không hợp lệ`
    )
  }

  return {
    id: profile.id,
    email,
    displayName,
    avatar,
    provider
  }
}

/**
 * Generic handler cho OAuth authentication
 */
const handleOAuth = async (
  profile: RawOAuthProfile,
  provider: OAuthProviderType
): Promise<User> => {
  try {
    // Chuẩn hóa profile
    const normalizedProfile = normalizeOAuthProfile(profile, provider)
    const providerConfig = OAUTH_PROVIDERS[provider]

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await userModel.findOneByEmail(normalizedProfile.email)

    if (existingUser) {
      // User đã tồn tại, cập nhật thông tin và đảm bảo active
      const updateData: Record<string, unknown> = {
        name: normalizedProfile.displayName,
        avatar: normalizedProfile.avatar,
        emailVerified: true,
        status: UserStatus.active, // OAuth users luôn được kích hoạt
        lastLogin: new Date()
      }

      // Chỉ set typeAccount = provider nếu user chưa có password riêng
      if (existingUser.password === providerConfig.passwordPlaceholder) {
        updateData.typeAccount = provider as AccountType
      }

      const updatedUser = await userModel.update(existingUser.id, updateData)
      if (!updatedUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
      }

return updatedUser
    } else {
      // Tạo user mới từ OAuth profile - luôn active
      const newUser = await userModel.createNew({
        name: normalizedProfile.displayName,
        email: normalizedProfile.email,
        password: providerConfig.passwordPlaceholder,
        roleId: DEFAULT_USER_ROLE_ID,
        avatar: normalizedProfile.avatar,
        emailVerified: true,
        status: UserStatus.active, // OAuth users luôn được kích hoạt ngay
        typeAccount: provider as AccountType
      })

return newUser as User
    }
  } catch (error) {
    throw error
  }
}

/**
 * Tạo JWT tokens cho user sau khi OAuth thành công với session tracking
 */
const generateAuthTokens = async (
  user: User,
  deviceInfo: string = '',
  ipAddress: string = ''
): Promise<AuthTokensResponse> => {
  try {
    // Tạo sessionId unique
    const sessionId = uuidv4()

    // Get role name from included relation (no separate query needed)
    const roleName =
      (user as unknown as { role: { name: string } }).role?.name || 'user'

    // Tạo tokens với sessionId
    const tokenUserData = {
      _id: String(user.id), // Convert to string for backward compatibility
      email: user.email,
      role: roleName as UserRole
    }

    const accessToken = JwtProvider.generateAccessToken(
      tokenUserData,
      sessionId
    )
    const refreshToken = JwtProvider.generateRefreshToken(
      tokenUserData,
      sessionId
    )

    // Tính thời gian hết hạn của refresh token (7 ngày)
    const refreshExpiresInStr = (env.JWT_REFRESH_EXPIRES_IN ||
      '7d') as ms.StringValue
    const refreshTokenExpiresIn = ms(refreshExpiresInStr)
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn)

    // Lưu session vào DB - userId is now number
    await sessionModel.createNew({
      sessionId,
      userId: user.id, // Now number
      refreshToken,
      deviceInfo: deviceInfo || null,
      ipAddress: ipAddress || null,
      expiresAt
    })

    return {
      accessToken,
      refreshToken,
      sessionId,
      user: {
        _id: user.id, // Map id to _id for backward compatibility
        name: user.name,
        email: user.email,
        avatar: user.avatar || undefined,
        role: roleName as UserRole,
        typeAccount: user.typeAccount as AccountType,
        emailVerified: user.emailVerified,
        status: user.status as UserStatus
      }
    }
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Lỗi khi tạo token xác thực: ${(error as Error).message}`
    )
  }
}

/**
 * Kiểm tra OAuth provider có được support không
 */
const isSupportedProvider = (provider: string): boolean => {
  return Object.keys(OAUTH_PROVIDERS).includes(provider.toUpperCase())
}

/**
 * Lấy thông tin provider config
 */
const getProviderConfig = (
  provider: string
): OAuthProviderConfig | undefined => {
  return OAUTH_PROVIDERS[provider.toUpperCase() as OAuthProviderType]
}

export const oAuthService = {
  handleOAuth,
  generateAuthTokens,
  normalizeOAuthProfile,
  isSupportedProvider,
  getProviderConfig,
  OAUTH_PROVIDERS
}
