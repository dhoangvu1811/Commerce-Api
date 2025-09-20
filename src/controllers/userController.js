import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import { oAuthService } from '~/services/oAuthService'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import ms from 'ms'
import { env } from '~/config/environment'

const register = async (req, res, next) => {
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

const login = async (req, res, next) => {
  try {
    const loginResult = await userService.login(req.body)

    // Set cookie cho refresh token, access token
    res.cookie('accessToken', loginResult.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('10m')
    })

    res.cookie('refreshToken', loginResult.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('7d') // 7 ngày
    })

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đăng nhập thành công',
      data: {
        user: loginResult.user
      }
    })
  } catch (error) {
    next(error)
  }
}

const logout = async (req, res, next) => {
  try {
    // Xóa cả access token và refresh token cookie
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

const getDetails = async (req, res, next) => {
  try {
    const userId = req.params?.id
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

const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded?._id
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

const updateUser = async (req, res, next) => {
  try {
    const userId = req.params?.id
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

const updateCurrentUser = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded?._id
    const updateData = { ...req.body }

    // Xử lý upload avatar nếu có file
    if (req.file) {
      const uploadResult = await CloudinaryProvider.streamUpload(
        req.file?.buffer,
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

const updateUserByAdmin = async (req, res, next) => {
  try {
    const userId = req.params?.id
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

const updatePassword = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded?._id
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

const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params?.id
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

const deleteMultipleUsers = async (req, res, next) => {
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

const getUsers = async (req, res, next) => {
  try {
    const { page, itemsPerPage, search, role, isActive, sort } = req.query || {}
    const queryFilter = {
      search,
      role,
      isActive,
      sort
    }

    const result = await userService.getUsers(page, itemsPerPage, queryFilter)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách người dùng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        code: StatusCodes.UNAUTHORIZED,
        message: 'Refresh token không tồn tại',
        data: null
      })
    }

    const result = await userService.refreshToken(refreshToken)

    // Set cookie cho access token mới
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('10m')
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

const createUserByAdmin = async (req, res, next) => {
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

const uploadAvatar = async (req, res, next) => {
  try {
    // Kiểm tra xem có file được upload không
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        code: StatusCodes.BAD_REQUEST,
        message: 'Vui lòng chọn ảnh avatar để upload',
        data: null
      })
    }

    // Upload avatar thông qua service
    const uploadResult = await userService.uploadAvatar(
      req.file?.buffer,
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
const googleOAuthSuccess = async (req, res, next) => {
  try {
    // User đã được authenticate bởi passport và có trong req.user
    const user = req.user

    if (!user) {
      return res.redirect(`${env.CLIENT_URL}/auth/failure?error=oauth_failed`)
    }

    // Sử dụng service để tạo JWT tokens
    const authResult = oAuthService.generateAuthTokens(user)

    // Set cookies
    res.cookie('accessToken', authResult.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('10m')
    })

    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('7d') // 7 days
    })

    // Redirect về client với success
    res.redirect(`${env.CLIENT_URL}/auth/success`)
  } catch (error) {
    next(error)
  }
}

// Google OAuth Failure Callback
const googleOAuthFailure = async (req, res, next) => {
  try {
    const errorMessage = req.query.error || 'oauth_failed'
    const errorDescription =
      req.query.error_description || 'Đăng nhập Google thất bại'

    // Log lỗi để debug
    if (env.BUILD_MODE === 'dev') {
      // eslint-disable-next-line no-console
      console.error('❌ Google OAuth Failure:', {
        errorMessage,
        errorDescription
      })
    }

    res.redirect(
      `${
        env.CLIENT_URL
      }/auth/failure?error=${errorMessage}&message=${encodeURIComponent(
        errorDescription
      )}`
    )
  } catch (error) {
    next(error)
  }
}

// Facebook OAuth Success Callback
const facebookOAuthSuccess = async (req, res, next) => {
  try {
    // User đã được authenticate bởi passport và có trong req.user
    const user = req.user

    if (!user) {
      return res.redirect(`${env.CLIENT_URL}/auth/failure?error=oauth_failed`)
    }

    // Sử dụng service để tạo JWT tokens
    const authResult = oAuthService.generateAuthTokens(user)

    // Set cookies
    res.cookie('accessToken', authResult.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('10m')
    })

    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('7d') // 7 days
    })

    // Redirect về client với success
    res.redirect(`${env.CLIENT_URL}/auth/success`)
  } catch (error) {
    next(error)
  }
}

// Facebook OAuth Failure Callback
const facebookOAuthFailure = async (req, res, next) => {
  try {
    const errorMessage = req.query.error || 'oauth_failed'
    const errorDescription =
      req.query.error_description || 'Đăng nhập Facebook thất bại'

    // Log lỗi để debug
    if (env.BUILD_MODE === 'dev') {
      // eslint-disable-next-line no-console
      console.error('❌ Facebook OAuth Failure:', {
        errorMessage,
        errorDescription
      })
    }

    res.redirect(
      `${
        env.CLIENT_URL
      }/auth/failure?error=${errorMessage}&message=${encodeURIComponent(
        errorDescription
      )}`
    )
  } catch (error) {
    next(error)
  }
}

const activateUser = async (req, res, next) => {
  try {
    const { userId } = req.params

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

const deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params

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
  facebookOAuthFailure
}
