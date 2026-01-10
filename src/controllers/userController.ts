/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * User Controller
 * Điều phối API requests cho users, auth, sessions
 */

import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService.js'
import { oAuthService } from '~/services/oAuthService.js'
import { sessionService } from '~/services/sessionService.js'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider.js'
import { WEBSITE_DOMAIN } from '~/utils/constants.js'
import { env } from '~/config/environment.js'
import { sessionModel } from '~/models/sessionModel.js'
import ms from 'ms'
import type { User, UserRole } from '~/types/user.types.js'

// Extend Request type to include jwtDecoded and file
interface AuthRequest extends Request {
  jwtDecoded?: {
    _id: string
    email: string
    role: string
    sessionId?: string
  }
  file?: Express.Multer.File
}

const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const createdUser = await userService.register(req.body)

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Đăng ký tài khoản thành công',
      data: createdUser
    })
  } catch (error) {
    next(error)
  }
}

const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Lấy thông tin device và IP cho session tracking
    const deviceInfo = req.get('User-Agent') || ''
    const ipAddress = req.ip || req.socket?.remoteAddress || ''

    const loginResult = await userService.login(req.body, deviceInfo, ipAddress)

    // Set cookie cho refresh token, access token
    res.cookie('accessToken', loginResult.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('30m' as ms.StringValue)
    })

    res.cookie('refreshToken', loginResult.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('7d' as ms.StringValue) // 7 ngày
    })

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đăng nhập thành công',
      data: {
        user: loginResult.user,
        sessionId: loginResult.sessionId // Thông tin debug (optional)
      }
    })
  } catch (error) {
    next(error)
  }
}

const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // sessionId có thể đến từ AT hoặc RT
    const sessionId = req.jwtDecoded?.sessionId

    // Đánh dấu logout session thay vì xóa (để tracking)
    if (sessionId) {
      try {
        await sessionModel.logoutSession(sessionId)
      } catch (error) {
        // Log error nhưng vẫn tiếp tục xóa cookies
        if (env.BUILD_MODE === 'dev') {
          console.error('❌ Lỗi khi logout session:', (error as Error).message)
        }
      }
    }

    // Luôn xóa cả access token và refresh token cookie
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đăng xuất thành công',
      data: null
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id!
    const user = await userService.getDetails(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy thông tin người dùng thành công',
      data: user
    })
  } catch (error) {
    next(error)
  }
}

const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const user = await userService.getDetails(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy thông tin người dùng hiện tại thành công',
      data: user
    })
  } catch (error) {
    next(error)
  }
}

const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id!
    const updatedUser = await userService.updateUser(userId, req.body)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật thông tin người dùng thành công',
      data: updatedUser
    })
  } catch (error) {
    next(error)
  }
}

const updateCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const updateData = { ...req.body }

    // Xử lý upload avatar nếu có file
    if (req.file) {
      const uploadResult = await CloudinaryProvider.streamUpload(
        req.file.buffer,
        'users-commerceweb'
      )
      updateData.avatar = uploadResult?.secure_url
    }

    const updatedUser = await userService.updateUser(userId, updateData)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật thông tin cá nhân thành công',
      data: updatedUser
    })
  } catch (error) {
    next(error)
  }
}

const updateUserByAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id!
    const updateData = { ...req.body }

    const updatedUser = await userService.updateUserByAdmin(userId, updateData)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật thông tin người dùng thành công',
      data: updatedUser
    })
  } catch (error) {
    next(error)
  }
}

const updatePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const updatedUser = await userService.updatePassword(userId, req.body)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đổi mật khẩu thành công',
      data: updatedUser
    })
  } catch (error) {
    next(error)
  }
}

const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id!
    const result = await userService.deleteUser(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa người dùng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteMultipleUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userIds } = req.body || {}
    const result = await userService.deleteMultipleUsers(userIds)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa các người dùng được chọn thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, itemsPerPage, search, role, isActive, sort } = req.query || {}
    const queryFilter = {
      search: search as string | undefined,
      role: role as UserRole | undefined,
      isActive: isActive as string | undefined,
      sort: sort as string | undefined
    }

    const result = await userService.getUsers(
      page ? parseInt(page as string) : 1,
      itemsPerPage ? parseInt(itemsPerPage as string) : 10,
      queryFilter
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách người dùng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

// Lấy danh sách users với session summary cho table overview (Admin only)
const getUsersWithSessionSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, itemsPerPage, search, role, isActive, sort } = req.query || {}
    const queryFilter = {
      search: search as string | undefined,
      role: role as UserRole | undefined,
      isActive: isActive as string | undefined,
      sort: sort as string | undefined
    }

    const result = await sessionService.getUsersWithSessionSummary(
      page ? parseInt(page as string) : 1,
      itemsPerPage ? parseInt(itemsPerPage as string) : 10,
      queryFilter
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách người dùng với thông tin sessions thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshTokenValue = req.cookies?.refreshToken

    if (!refreshTokenValue) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        code: StatusCodes.UNAUTHORIZED,
        message: 'Refresh token không tồn tại',
        data: null
      })
      return
    }

    const result = await userService.refreshToken(refreshTokenValue)

    // Set cookie cho access token mới
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('30m' as ms.StringValue)
    })

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Làm mới token thành công',
      data: null
    })
  } catch (error) {
    next(error)
  }
}

const createUserByAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const createData = { ...req.body }

    const createdUser = await userService.createUserByAdmin(createData)

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo người dùng thành công',
      data: createdUser
    })
  } catch (error) {
    next(error)
  }
}

const uploadAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Kiểm tra xem có file được upload không
    if (!req.file) {
      res.status(StatusCodes.BAD_REQUEST).json({
        code: StatusCodes.BAD_REQUEST,
        message: 'Vui lòng chọn ảnh avatar để upload',
        data: null
      })
      return
    }

    // Upload avatar thông qua service
    const uploadResult = await userService.uploadAvatar(
      req.file.buffer,
      'users-commerceweb'
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Upload ảnh thành công',
      data: {
        avatarUrl: uploadResult?.secure_url,
        publicId: uploadResult?.public_id
      }
    })
  } catch (error) {
    next(error)
  }
}

// Google OAuth Success Callback
const googleOAuthSuccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User đã được authenticate bởi passport và có trong req.user
    const user = req.user as User | undefined

    if (!user) {
      res.redirect(`${WEBSITE_DOMAIN}/auth/failure?error=oauth_failed`)
      return
    }

    // Lấy thông tin device và IP cho session tracking
    const deviceInfo = req.get('User-Agent') || 'Google OAuth'
    const ipAddress = req.ip || req.socket?.remoteAddress || ''

    // Sử dụng service để tạo JWT tokens với session tracking
    const authResult = await oAuthService.generateAuthTokens(
      user,
      deviceInfo,
      ipAddress
    )

    // Set cookies
    res.cookie('accessToken', authResult.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('30m' as ms.StringValue)
    })

    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('7d' as ms.StringValue) // 7 days
    })

    // Redirect về client với success
    res.redirect(`${WEBSITE_DOMAIN}/auth/success`)
  } catch (error) {
    next(error)
  }
}

// Google OAuth Failure Callback
const googleOAuthFailure = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errorMessage = (req.query.error as string) || 'oauth_failed'
    const errorDescription =
      (req.query.error_description as string) || 'Đăng nhập Google thất bại'

    // Log lỗi để debug
    if (env.BUILD_MODE === 'dev') {
      console.error('❌ Google OAuth Failure:', {
        errorMessage,
        errorDescription
      })
    }

    res.redirect(
      `${WEBSITE_DOMAIN}/auth/failure?error=${errorMessage}&message=${encodeURIComponent(
        errorDescription
      )}`
    )
  } catch (error) {
    next(error)
  }
}

// Facebook OAuth Success Callback
const facebookOAuthSuccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User đã được authenticate bởi passport và có trong req.user
    const user = req.user as User | undefined

    if (!user) {
      res.redirect(`${WEBSITE_DOMAIN}/auth/failure?error=oauth_failed`)
      return
    }

    // Lấy thông tin device và IP cho session tracking
    const deviceInfo = req.get('User-Agent') || 'Facebook OAuth'
    const ipAddress = req.ip || req.socket?.remoteAddress || ''

    // Sử dụng service để tạo JWT tokens với session tracking
    const authResult = await oAuthService.generateAuthTokens(
      user,
      deviceInfo,
      ipAddress
    )

    // Set cookies
    res.cookie('accessToken', authResult.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('30m' as ms.StringValue)
    })

    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('7d' as ms.StringValue) // 7 days
    })

    // Redirect về client với success
    res.redirect(`${WEBSITE_DOMAIN}/auth/success`)
  } catch (error) {
    next(error)
  }
}

// Facebook OAuth Failure Callback
const facebookOAuthFailure = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errorMessage = (req.query.error as string) || 'oauth_failed'
    const errorDescription =
      (req.query.error_description as string) || 'Đăng nhập Facebook thất bại'

    // Log lỗi để debug
    if (env.BUILD_MODE === 'dev') {
      console.error('❌ Facebook OAuth Failure:', {
        errorMessage,
        errorDescription
      })
    }

    res.redirect(
      `${WEBSITE_DOMAIN}/auth/failure?error=${errorMessage}&message=${encodeURIComponent(
        errorDescription
      )}`
    )
  } catch (error) {
    next(error)
  }
}

const activateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId!

    const activatedUser = await userService.activateUser(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Kích hoạt tài khoản thành công',
      data: activatedUser
    })
  } catch (error) {
    next(error)
  }
}

const deactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId!

    const deactivatedUser = await userService.deactivateUser(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Vô hiệu hóa tài khoản thành công',
      data: deactivatedUser
    })
  } catch (error) {
    next(error)
  }
}

// Gửi email xác minh tài khoản
const sendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body
    const result = await userService.sendVerificationEmail(email)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: result.message,
      data: {
        email: result.email,
        expiresIn: result.expiresIn
      }
    })
  } catch (error) {
    next(error)
  }
}

// Xác minh tài khoản người dùng
const verifyUserAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, token } = req.query
    const result = await userService.verifyUserAccount(
      email as string,
      token as string
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: result.message,
      data: result.user
    })
  } catch (error) {
    next(error)
  }
}

// Revoke user session (Admin only)
const revokeUserSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.body
    const result = await sessionService.revokeUserSession(sessionId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Thu hồi phiên đăng nhập thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

// Revoke all sessions của một user (Admin only)
const revokeAllUserSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId!
    const result = await sessionService.revokeAllUserSessions(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: `Thu hồi thành công ${result.revokedSessions} phiên đăng nhập`,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

// Lấy danh sách sessions của user (Admin only)
const getUserSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId!
    const result = await sessionService.getUserSessions(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách phiên đăng nhập thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

// Lấy sessions của user hiện tại
const getCurrentUserSessions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const currentSessionId = req.jwtDecoded?.sessionId
    const result = await sessionService.getCurrentUserSessions(
      userId,
      currentSessionId
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách phiên đăng nhập của bạn thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

// User tự revoke session của chính mình
const revokeMySession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.jwtDecoded!._id
    const { sessionId } = req.body
    const result = await sessionService.revokeMySession(userId, sessionId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Thu hồi phiên đăng nhập thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const userController = {
  register,
  login,
  logout,
  getDetails,
  getCurrentUser,
  updateUser,
  updateCurrentUser,
  updateUserByAdmin,
  updatePassword,
  deleteUser,
  deleteMultipleUsers,
  getUsers,
  refreshToken,
  createUserByAdmin,
  uploadAvatar,
  activateUser,
  deactivateUser,
  googleOAuthSuccess,
  googleOAuthFailure,
  facebookOAuthSuccess,
  facebookOAuthFailure,
  sendVerificationEmail,
  verifyUserAccount,
  getUsersWithSessionSummary,
  revokeUserSession,
  revokeAllUserSessions,
  getUserSessions,
  getCurrentUserSessions,
  revokeMySession
}
