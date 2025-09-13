import { userModel } from '~/models/userModel'
import { JwtProvider } from '~/providers/JwtProvider'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Service xử lý logic đăng nhập Google OAuth
 */
const handleGoogleOAuth = async (googleProfile) => {
  try {
    const email = googleProfile.emails[0].value
    const displayName = googleProfile.displayName || ''
    const avatar = googleProfile.photos?.[0]?.value || ''

    // Kiểm tra user đã tồn tại chưa
    let existingUser = await userModel.findOneByEmail(email)

    if (existingUser) {
      // User đã tồn tại, cập nhật thông tin từ Google
      const updatedUser = await userModel.update(existingUser._id, {
        name: displayName,
        avatar: avatar,
        emailVerified: true,
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      return updatedUser
    } else {
      // Tạo user mới từ Google profile
      const newUserData = {
        name: displayName,
        email: email,
        avatar: avatar,
        emailVerified: true,
        role: 'user',
        isActive: true,
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
 * Tạo JWT tokens cho user sau khi OAuth thành công
 */
const generateAuthTokens = (user) => {
  try {
    const accessToken = JwtProvider.generateAccessToken(user)
    const refreshToken = JwtProvider.generateRefreshToken(user)

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
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

export const googleOAuthService = {
  handleGoogleOAuth,
  generateAuthTokens
}
