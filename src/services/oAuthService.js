/* eslint-disable indent */
import { userModel } from '~/models/userModel'
import { sessionModel } from '~/models/sessionModel'
import { JwtProvider } from '~/providers/JwtProvider'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import ms from 'ms'
import { env } from '~/config/environment'

/**
 * Generic OAuth Service cho tất cả providers (Google, Facebook, v.v.)
 *
 * QUAN TRỌNG:
 * - OAuth users luôn được kích hoạt tự động (isActive = true)
 * - Local registration users cần admin kích hoạt (isActive = false)
 */

/**
 * Mapping các OAuth providers
 */
const OAUTH_PROVIDERS = {
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
const normalizeOAuthProfile = (profile, provider) => {
  const providerConfig = OAUTH_PROVIDERS[provider]
  if (!providerConfig) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Unsupported OAuth provider: ${provider}`
    )
  }

  let email, displayName, avatar

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
const handleOAuth = async (profile, provider) => {
  try {
    // Chuẩn hóa profile
    const normalizedProfile = normalizeOAuthProfile(profile, provider)
    const providerConfig = OAUTH_PROVIDERS[provider]

    // Kiểm tra user đã tồn tại chưa
    let existingUser = await userModel.findOneByEmail(normalizedProfile.email)

    if (existingUser) {
      // User đã tồn tại, cập nhật thông tin và đảm bảo active
      const updateData = {
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

      const updatedUser = await userModel.update(existingUser._id, updateData)
      return updatedUser
    } else {
      // Tạo user mới từ OAuth profile - luôn active
      const newUserData = {
        name: normalizedProfile.displayName,
        email: normalizedProfile.email,
        password: providerConfig.passwordPlaceholder,
        avatar: normalizedProfile.avatar,
        emailVerified: true,
        role: 'user',
        isActive: true, // OAuth users luôn được kích hoạt ngay
        typeAccount: provider,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const newUser = await userModel.createNew(newUserData)
      return newUser
    }
  } catch (error) {
    throw error
  }
}

/**
 * Tạo JWT tokens cho user sau khi OAuth thành công với session tracking
 */
const generateAuthTokens = async (user, deviceInfo = '', ipAddress = '') => {
  try {
    // Tạo sessionId unique
    const sessionId = uuidv4()

    // Tạo tokens với sessionId
    const accessToken = JwtProvider.generateAccessToken(user, sessionId)
    const refreshToken = JwtProvider.generateRefreshToken(user, sessionId)

    // Tính thời gian hết hạn của refresh token (7 ngày)
    const refreshTokenExpiresIn = ms(env.JWT_REFRESH_EXPIRES_IN) || ms('7d')
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn)

    // Lưu session vào DB
    await sessionModel.createNew({
      sessionId,
      userId: user._id.toString(),
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
      `Lỗi khi tạo token xác thực: ${error.message}`
    )
  }
}

/**
 * Kiểm tra OAuth provider có được support không
 */
const isSupportedProvider = (provider) => {
  return Object.keys(OAUTH_PROVIDERS).includes(provider.toUpperCase())
}

/**
 * Lấy thông tin provider config
 */
const getProviderConfig = (provider) => {
  return OAUTH_PROVIDERS[provider.toUpperCase()]
}

export const oAuthService = {
  handleOAuth,
  generateAuthTokens,
  normalizeOAuthProfile,
  isSupportedProvider,
  getProviderConfig,
  OAUTH_PROVIDERS
}
