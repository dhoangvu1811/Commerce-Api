/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable indent */
/**
 * OAuth Service
 * Generic OAuth Service cho tất cả providers (Google, Facebook, v.v.)
 *
 * QUAN TRỌNG:
 * - OAuth users luôn được kích hoạt tự động (isActive = true)
 * - Local registration users cần admin kích hoạt (isActive = false)
 */

import { userModel } from '~/models/userModel.js'
import { sessionModel } from '~/models/sessionModel.js'
import { JwtProvider } from '~/providers/JwtProvider.js'
import ApiError from '~/utils/ApiError.js'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import ms from 'ms'
import { env } from '~/config/environment.js'
import type { User, UserResponse } from '~/types/user.types.js'

// ============================================================
// === Types ===
// ============================================================

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

// ============================================================
// === Constants ===
// ============================================================

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

// ============================================================
// === Functions ===
// ============================================================

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
      const updateData: Partial<User> = {
        name: normalizedProfile.displayName,
        avatar: normalizedProfile.avatar,
        emailVerified: true,
        isActive: true, // OAuth users luôn được kích hoạt
        lastLogin: new Date(),
        updatedAt: new Date()
      }

      // Chỉ set typeAccount = provider nếu user chưa có password riêng
      if (existingUser.password === providerConfig.passwordPlaceholder) {
        updateData.typeAccount = provider
      }

      const updatedUser = await userModel.update(
        existingUser._id!.toString(),
        updateData
      )
      return updatedUser as User
    } else {
      // Tạo user mới từ OAuth profile - luôn active
      const newUserData: Partial<User> = {
        name: normalizedProfile.displayName,
        email: normalizedProfile.email,
        password: providerConfig.passwordPlaceholder,
        avatar: normalizedProfile.avatar,
        emailVerified: true,
        role: 'user',
        isActive: true, // OAuth users luôn được kích hoạt ngay
        typeAccount: provider,
        lastLogin: new Date(),
        phone: '',
        address: '',
        dateOfBirth: null,
        gender: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const newUser = await userModel.createNew(newUserData as User)
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

    // Tạo tokens với sessionId
    const accessToken = JwtProvider.generateAccessToken(
      { _id: user._id!.toString(), email: user.email, role: user.role },
      sessionId
    )
    const refreshToken = JwtProvider.generateRefreshToken(
      { _id: user._id!.toString(), email: user.email, role: user.role },
      sessionId
    )

    // Tính thời gian hết hạn của refresh token (7 ngày)
    const refreshExpiresInStr = (env.JWT_REFRESH_EXPIRES_IN ||
      '7d') as ms.StringValue
    const refreshTokenExpiresIn = ms(refreshExpiresInStr)
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn)

    // Lưu session vào DB
    await sessionModel.createNew({
      sessionId,
      userId: user._id!.toString(),
      refreshToken,
      deviceInfo: deviceInfo || 'OAuth Login',
      ipAddress: ipAddress || '',
      expiresAt
    })

    return {
      accessToken,
      refreshToken,
      sessionId,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        typeAccount: user.typeAccount,
        emailVerified: user.emailVerified
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
