/* eslint-disable indent */

/**
 * User Service - Prisma Version
 * Xử lý logic business cho user - bao gồm auth, profile, admin management
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { userModel, type User, type UserFilter, UserStatus, AccountType } from '~/models/userModel.js'
import { sessionModel } from '~/models/sessionModel.js'
import { roleModel } from '~/models/roleModel.js'
import { prisma } from '~/config/prisma.js'
import bcrypt from 'bcrypt'
import { JwtProvider } from '~/providers/JwtProvider.js'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider.js'
import { BrevoProvider } from '~/providers/BrevoProvider.js'
import { WEBSITE_DOMAIN } from '~/utils/constants.js'
import { v4 as uuidv4 } from 'uuid'
import ms from 'ms'
import { env } from '~/config/environment.js'
import type {
  UserRole,
  RegisterInput,
  LoginInput,
  LoginResult,
  UpdateUserInput as UpdateUserInputType,
  UpdateUserByAdminInput,
  UpdatePasswordInput,
  UserResponse as UserResponseType,
  UserQueryFilter,
  PaginatedUsersResult,
  RefreshTokenResult,
  EmailVerificationResult,
  VerifyAccountResult,
  ResetPasswordInput,
  ForgotPasswordResult,
  ResetPasswordResult
} from '~/types/user.types.js'
import type { UploadResult, DeleteResultInfo } from '~/types/common.types.js'

const FORGOT_PASSWORD_GENERIC_MESSAGE = 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.'

const ROLE_NAMES = {
  ADMIN: 'admin',
  USER: 'user'
} as const

const roleIdCache = new Map<string, number>()

const getRoleIdByName = async (roleName: string): Promise<number> => {
  if (roleIdCache.has(roleName)) {
    return roleIdCache.get(roleName) as number
  }

  const role = await prisma.role.findFirst({ where: { name: roleName } })
  if (!role) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Role "${roleName}" chưa được seed trong database`)
  }

  roleIdCache.set(roleName, role.id)

  return role.id
}

/**
 * Parse userId string to number
 */
const parseUserId = (userId: string): number => {
  const id = parseInt(userId, 10)
  if (isNaN(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID không hợp lệ')
  }

  return id
}

/**
 * Hash mật khẩu
 */
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12

  return await bcrypt.hash(password, saltRounds)
}

/**
 * So sánh mật khẩu
 */
const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword)
}

/**
 * Đăng ký user mới
 */
const register = async (userData: RegisterInput): Promise<UserResponseType> => {
  try {
    const defaultUserRoleId = await getRoleIdByName(ROLE_NAMES.USER)

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await userModel.findOneByEmail(userData.email)

    if (existingUser) {
      throw new ApiError(StatusCodes.CONFLICT, `Email "${userData.email}" đã được sử dụng`)
    }

    // Hash mật khẩu
    const hashedPassword = await hashPassword(userData.password)

    // Tạo user mới với Prisma
    const createdUser = await userModel.createNew({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      roleId: defaultUserRoleId,
      typeAccount: AccountType.LOCAL,
      status: UserStatus.inactive
    })

    // Gửi email xác minh ngay sau khi đăng ký thành công
    try {
      await sendVerificationEmail(createdUser.email)
    } catch (error) {
      // Log lỗi nhưng không chặn luồng đăng ký
      console.error('❌ Gửi email xác minh thất bại:', (error as Error).message)
    }

    // Loại bỏ password khỏi response
    const { password: _password, ...userResponse } = createdUser

    return userResponse as unknown as UserResponseType
  } catch (error) {
    throw error
  }
}

/**
 * Đăng nhập
 */
const login = async (
  loginData: LoginInput,
  deviceInfo?: {
    userAgent: string
    ip: string
    deviceId?: string
  }
): Promise<LoginResult> => {
  try {
    const { email, password } = loginData

    // Tìm user theo email
    const user = await userModel.findOneByEmail(email)

    if (!user) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Email hoặc mật khẩu không đúng')
    }

    // So sánh mật khẩu
    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Email hoặc mật khẩu không đúng')
    }

    // Cập nhật thời gian đăng nhập cuối
    await userModel.updateLastLogin(user.id)

    // Tạo sessionId unique
    const sessionId = uuidv4()

    // Get role name from included relation (no separate query needed)
    const roleName = (user as unknown as { role: { name: string } }).role?.name || 'user'

    // Kiểm tra loginContext - nếu đăng nhập từ Admin Dashboard thì phải là admin hoặc staff
    const { loginContext } = loginData
    const adminRoles = ['admin', 'staff']
    if (loginContext === 'admin' && !adminRoles.includes(roleName)) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập vào trang quản trị')
    }

    // Tạo token với sessionId
    const tokenUserData = {
      _id: String(user.id), // Convert to string for backward compatibility
      email: user.email,
      role: roleName as UserRole
    }
    const accessToken = JwtProvider.generateAccessToken(tokenUserData, sessionId)
    const refreshToken = JwtProvider.generateRefreshToken(tokenUserData, sessionId)

    // Tính thời gian hết hạn của refresh token (7 ngày)
    const refreshExpiresInStr = (env.JWT_REFRESH_EXPIRES_IN || '7d') as ms.StringValue
    const refreshTokenExpiresIn = ms(refreshExpiresInStr)
    const expiresAt = new Date(Date.now() + refreshTokenExpiresIn)

    // Lưu session vào DB với Prisma
    await sessionModel.createNew({
      sessionId,
      userId: user.id, // Now number
      refreshToken,
      deviceInfo: deviceInfo?.userAgent || null,
      ipAddress: deviceInfo?.ip || null,
      expiresAt
    })

    // Loại bỏ password khỏi response
    const { password: _userPassword, ...userResponse } = user

    return {
      user: userResponse as unknown as Omit<User, 'password'>,
      accessToken,
      refreshToken,
      sessionId
    }
  } catch (error) {
    throw error
  }
}

/**
 * Refresh access token
 */
const refreshToken = async (refreshTokenValue: string): Promise<RefreshTokenResult> => {
  try {
    // Verify refresh token
    const decoded = JwtProvider.verifyRefreshToken(refreshTokenValue)

    // Kiểm tra sessionId từ refresh token
    const sessionIdValue = decoded.sessionId

    if (sessionIdValue) {
      // Kiểm tra session có còn active không
      const activeSession = await sessionModel.findBySessionId(sessionIdValue)

      if (!activeSession) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Phiên đăng nhập đã bị thu hồi hoặc hết hạn. Vui lòng đăng nhập lại.'
        )
      }

      // Kiểm tra session có khớp với user không
      if (String(activeSession.userId) !== decoded._id) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Phiên đăng nhập không hợp lệ')
      }
    }

    // Tìm user
    const userId = parseUserId(decoded._id)
    const user = await userModel.findOneById(userId)

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.')
    }

    // Get role name from included relation
    const roleName = (user as unknown as { role: { name: string } }).role?.name || 'user'

    // Tạo access token mới với sessionId
    const tokenUserData = {
      _id: String(user.id),
      email: user.email,
      role: roleName as UserRole
    }
    const newAccessToken = JwtProvider.generateAccessToken(tokenUserData, sessionIdValue)

    return {
      accessToken: newAccessToken
    }
  } catch (error) {
    if ((error as Error).name === 'JsonWebTokenError' || (error as Error).name === 'TokenExpiredError') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    }
    throw error
  }
}

/**
 * Lấy chi tiết user
 */
const getDetails = async (userId: string): Promise<UserResponseType> => {
  try {
    const userIdNum = parseUserId(userId)
    const user = await userModel.findOneById(userIdNum)

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Không tìm thấy tài khoản. Vui lòng đăng nhập lại.')
    }

    // Loại bỏ password khỏi response
    const { password: _password, ...userResponse } = user

    return userResponse as unknown as UserResponseType
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật user (bởi chính user)
 */
const updateUser = async (userId: string, updateData: UpdateUserInputType): Promise<UserResponseType> => {
  try {
    const userIdNum = parseUserId(userId)

    // Kiểm tra user có tồn tại không
    const existingUser = await userModel.findOneById(userIdNum)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tài khoản. Vui lòng đăng nhập lại.')
    }

    // Cập nhật user
    const sanitizedData = { ...updateData }
    if ((sanitizedData as any).gender === '') {
      ;(sanitizedData as any).gender = undefined
    }

    const updatedUser = await userModel.update(userIdNum, sanitizedData)

    if (!updatedUser) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không thể cập nhật thông tin')
    }

    // Loại bỏ password khỏi response
    const { password: _password, ...userResponse } = updatedUser

    return userResponse as unknown as UserResponseType
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật password
 */
const updatePassword = async (userId: string, passwordData: UpdatePasswordInput): Promise<{ message: string }> => {
  try {
    const userIdNum = parseUserId(userId)

    // Tìm user
    const user = await userModel.findOneById(userIdNum)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy tài khoản. Vui lòng đăng nhập lại.')
    }

    // Kiểm tra mật khẩu hiện tại
    const isOAuthUser = user.typeAccount === 'GOOGLE' || user.typeAccount === 'FACEBOOK'
    const hasOAuthPassword = user.password === 'GOOGLE-AUTH1*#' || user.password === 'FACEBOOK-AUTH1*#'

    if (!isOAuthUser || (isOAuthUser && !hasOAuthPassword)) {
      if (!passwordData.currentPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng nhập mật khẩu hiện tại')
      }

      const isCurrentPasswordValid = await comparePassword(passwordData.currentPassword, user.password)

      if (!isCurrentPasswordValid) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Mật khẩu hiện tại không đúng')
      }
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await hashPassword(passwordData.newPassword)

    // Cập nhật mật khẩu
    const updateData: { password: string; typeAccount?: AccountType } = {
      password: hashedNewPassword
    }

    // Nếu OAuth user lần đầu set password
    if (
      (user.typeAccount === AccountType.GOOGLE && user.password === 'GOOGLE-AUTH1*#') ||
      (user.typeAccount === AccountType.FACEBOOK && user.password === 'FACEBOOK-AUTH1*#')
    ) {
      updateData.typeAccount = AccountType.LOCAL
    }

    await userModel.update(userIdNum, updateData)

    // Revoke all sessions (force re-login with new password)
    await sessionModel.revokeAllUserSessions(userIdNum)

    return { message: 'Cập nhật mật khẩu thành công' }
  } catch (error) {
    throw error
  }
}

/**
 * Upload avatar
 */
const uploadAvatar = async (fileBuffer: Buffer, folderName: string = 'users-commerceweb'): Promise<UploadResult> => {
  try {
    const uploadResult = await CloudinaryProvider.streamUpload(fileBuffer, folderName)

    return uploadResult as UploadResult
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Lỗi upload ảnh lên Cloudinary: ${(error as Error).message}`)
  }
}

/**
 * Lấy danh sách users (admin)
 */
const getUsers = async (
  page: number = 1,
  itemsPerPage: number = 10,
  queryFilter: UserQueryFilter = {}
): Promise<PaginatedUsersResult> => {
  try {
    const { search, role, status, sort } = queryFilter

    // Build Prisma filter
    const filter: UserFilter = {}

    if (search) {
      filter.search = search
    }

    // Role: lookup roleId from role name
    if (role) {
      const roleRecord = await prisma.role.findFirst({
        where: { name: role }
      })
      if (roleRecord) {
        filter.roleId = roleRecord.id
      }
    }

    if (status !== undefined) {
      filter.status = status
    }

    // Build orderBy
    let orderBy: { [key: string]: 'asc' | 'desc' } = { createdAt: 'desc' }

    if (sort) {
      switch (sort) {
        case 'name_asc':
          orderBy = { name: 'asc' }
          break
        case 'name_desc':
          orderBy = { name: 'desc' }
          break
        case 'email_asc':
          orderBy = { email: 'asc' }
          break
        case 'email_desc':
          orderBy = { email: 'desc' }
          break
        case 'lastLogin_desc':
          orderBy = { lastLogin: 'desc' }
          break
        case 'lastLogin_asc':
          orderBy = { lastLogin: 'asc' }
          break
        default:
          orderBy = { createdAt: 'desc' }
      }
    }

    const result = await userModel.getMany(filter, page, itemsPerPage, orderBy)

    // Loại bỏ password khỏi tất cả user trong response
    const usersWithoutPassword = result.users.map(user => {
      const { password: _password, ...userWithoutPassword } = user

      return userWithoutPassword as unknown as UserResponseType
    })

    return {
      ...result,
      users: usersWithoutPassword
    }
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật user bởi admin
 */
const updateUserByAdmin = async (userId: string, updateData: UpdateUserByAdminInput): Promise<UserResponseType> => {
  try {
    const userIdNum = parseUserId(userId)

    // Sanitize gender
    if ((updateData as any).gender === '') {
      ;(updateData as any).gender = undefined
    }

    // Kiểm tra user có tồn tại không
    const existingUser = await userModel.findOneById(userIdNum)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Kiểm tra duplicate email
    if (updateData.email && updateData.email !== existingUser.email) {
      const duplicateUser = await userModel.findOneByEmail(updateData.email)
      if (duplicateUser) {
        throw new ApiError(StatusCodes.CONFLICT, `Email "${updateData.email}" đã được sử dụng`)
      }
    }

    // Convert role/roleId
    const prismaUpdateData: Record<string, unknown> = { ...updateData }

    // Handle roleId (priority) or role name
    if ('roleId' in updateData && updateData.roleId) {
      prismaUpdateData.roleId = updateData.roleId
      // If both are present, we removed 'role' implicitly by not renaming it to roleId.
      // We should ensure 'role' key is removed if it exists in updateData so prisma doesn't error (User model doesn't have 'role' field).
      delete prismaUpdateData.role
    } else if ('role' in updateData && updateData.role) {
      const roleRecord = await prisma.role.findFirst({
        where: { name: updateData.role }
      })
      if (roleRecord) {
        prismaUpdateData.roleId = roleRecord.id
      }
      delete prismaUpdateData.role
    }

    // Handle status mapping (if it's not already correct UserStatus)
    if ('status' in updateData && updateData.status) {
      prismaUpdateData.status = updateData.status
    }

    const updatedUser = await userModel.update(userIdNum, prismaUpdateData)

    // Revoke all sessions if role or status changed to inactive
    if (
      (prismaUpdateData.roleId && prismaUpdateData.roleId !== existingUser.roleId) ||
      (prismaUpdateData.status && prismaUpdateData.status !== UserStatus.active)
    ) {
      await sessionModel.revokeAllUserSessions(userIdNum)
    }

    const { password: _password, ...userResponse } = updatedUser || {}

    return userResponse as unknown as UserResponseType
  } catch (error) {
    throw error
  }
}

/**
 * Tạo user bởi admin
 */
const createUserByAdmin = async (
  userData: RegisterInput & {
    role?: UserRole
    roleId?: number
    status?: UserStatus
    emailVerified?: boolean
    typeAccount?: AccountType
  }
): Promise<UserResponseType> => {
  try {
    const defaultUserRoleId = await getRoleIdByName(ROLE_NAMES.USER)

    const existingUser = await userModel.findOneByEmail(userData.email)

    if (existingUser) {
      throw new ApiError(StatusCodes.CONFLICT, `Email "${userData.email}" đã được sử dụng`)
    }

    const hashedPassword = await hashPassword(userData.password)

    // Get roleId (priority: roleId > role name > default)
    let roleId = defaultUserRoleId
    if (userData.roleId) {
      roleId = userData.roleId
    } else if (userData.role) {
      const roleRecord = await prisma.role.findFirst({
        where: { name: userData.role }
      })
      if (roleRecord) {
        roleId = roleRecord.id
      }
    }

    const createdUser = await userModel.createNew({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      roleId,
      phoneNumber: userData.phoneNumber || undefined,
      address: userData.address || undefined,
      dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
      gender: userData.gender || undefined,
      status: userData.status !== undefined ? userData.status : UserStatus.active,
      emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : false,
      typeAccount: userData.typeAccount || AccountType.LOCAL
    })

    const { password: _password, ...userResponse } = createdUser

    return userResponse as unknown as UserResponseType
  } catch (error) {
    throw error
  }
}

/**
 * Xóa user
 */
const deleteUser = async (userId: string, currentUserId: string): Promise<DeleteResultInfo> => {
  try {
    const userIdNum = parseUserId(userId)
    const currentUserIdNum = parseUserId(currentUserId)

    // Không cho phép xóa chính mình
    if (userIdNum === currentUserIdNum) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn không thể xóa chính tài khoản của mình')
    }

    const existingUser = await userModel.findOneById(userIdNum)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    const result = await userModel.deleteOneById(userIdNum)

    return {
      deletedCount: result ? 1 : 0,
      acknowledged: result !== null
    } as DeleteResultInfo
  } catch (error) {
    throw error
  }
}

/**
 * Xóa nhiều users
 */
const deleteMultipleUsers = async (userIds: string[], currentUserId: string): Promise<DeleteResultInfo> => {
  try {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng chọn ít nhất một người dùng để xóa')
    }

    // Parse all IDs
    const currentUserIdNum = parseUserId(currentUserId)
    const numberIds = userIds.map(id => {
      const num = parseInt(id, 10)
      if (isNaN(num)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Một số người dùng được chọn không hợp lệ')
      }
      if (num === currentUserIdNum) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Bạn không thể xóa chính tài khoản của mình trong danh sách')
      }

      return num
    })

    // Kiểm tra các user có tồn tại không
    const existingUsers = await userModel.findByIds(numberIds)
    const existingIds = existingUsers.map(user => user.id)
    const notFoundIds = numberIds.filter(id => !existingIds.includes(id))

    if (notFoundIds.length > 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Một số người dùng không tồn tại. Vui lòng làm mới trang và thử lại.')
    }

    const result = await userModel.deleteManyByIds(numberIds)

    return {
      deletedCount: result.count,
      message: `Đã xóa ${result.count} người dùng được chọn`,
      deletedIds: userIds
    }
  } catch (error) {
    throw error
  }
}

/**
 * Kích hoạt user
 */
const activateUser = async (userId: string): Promise<UserResponseType> => {
  try {
    const userIdNum = parseUserId(userId)

    const existingUser = await userModel.findOneById(userIdNum)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    if (existingUser.status === UserStatus.active) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tài khoản đã được kích hoạt trước đó')
    }

    const activatedUser = await userModel.activateUser(userIdNum)
    if (!activatedUser) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không thể kích hoạt tài khoản')
    }

    const { password: _password, ...userResponse } = activatedUser

    return userResponse as unknown as UserResponseType
  } catch (error) {
    throw error
  }
}

/**
 * Vô hiệu hóa user
 */
const deactivateUser = async (userId: string): Promise<UserResponseType> => {
  try {
    const adminRoleId = await getRoleIdByName(ROLE_NAMES.ADMIN)
    const userIdNum = parseUserId(userId)

    const existingUser = await userModel.findOneById(userIdNum)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Check admin role theo role name đã resolve từ DB
    if (existingUser.roleId === adminRoleId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Không thể vô hiệu hóa tài khoản quản trị viên')
    }

    if (existingUser.status === UserStatus.inactive) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tài khoản đã bị vô hiệu hóa trước đó')
    }

    const deactivatedUser = await userModel.deactivateUser(userIdNum)
    if (!deactivatedUser) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không thể vô hiệu hóa tài khoản')
    }

    // Revoke all sessions immediately
    await sessionModel.revokeAllUserSessions(userIdNum)

    const { password: _password, ...userResponse } = deactivatedUser

    return userResponse as unknown as UserResponseType
  } catch (error) {
    throw error
  }
}

/**
 * Gửi email xác minh tài khoản
 */
const sendVerificationEmail = async (email: string): Promise<EmailVerificationResult> => {
  try {
    const user = await userModel.findOneByEmail(email)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Email không tồn tại trong hệ thống')
    }

    if (user.emailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tài khoản đã được xác minh')
    }

    const verifyToken = JwtProvider.generateVerificationToken(email)
    const verificationLink = `${WEBSITE_DOMAIN}/verify-account?email=${encodeURIComponent(email)}&token=${verifyToken}`

    const emailSubject = 'Xác minh tài khoản - Commerce Web'
    const emailContent = `
        <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Xác minh tài khoản</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f6f9; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(90deg, #007bff, #0056b3); color: #ffffff; text-align: center; padding: 30px 20px; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 25px; line-height: 1.6; }
        .content h2 { margin-top: 0; color: #007bff; font-size: 20px; }
        .button { display: inline-block; background: #007bff; color: #ffffff !important; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-size: 16px; margin: 20px 0; }
        .link-box { background: #f1f3f5; padding: 12px; border-radius: 6px; font-size: 14px; word-break: break-all; }
        .footer { text-align: center; font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eaeaea; background: #fafafa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Xác minh tài khoản của bạn</h1></div>
        <div class="content">
          <h2>Xin chào,</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Commerce Web</strong>.</p>
          <p>Để hoàn tất đăng ký, vui lòng nhấp vào nút bên dưới:</p>
          <div style="text-align: center;"><a href="${verificationLink}" class="button">Xác minh ngay</a></div>
          <p>Nếu nút không hoạt động, sao chép link sau vào trình duyệt:</p>
          <div class="link-box">${verificationLink}</div>
          <p><strong>Lưu ý:</strong> Link có hiệu lực trong 24 giờ.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Commerce Web. Mọi quyền được bảo lưu.</p></div>
      </div>
    </body>
    </html>
    `

    await BrevoProvider.sendEmail(email, emailSubject, emailContent)

    return {
      email,
      message: 'Email xác minh đã được gửi thành công',
      expiresIn: '24 hours'
    }
  } catch (error) {
    throw error
  }
}

/**
 * Xác minh tài khoản người dùng
 */
const verifyUserAccount = async (email: string, token: string): Promise<VerifyAccountResult> => {
  try {
    const decoded = JwtProvider.verifyVerificationToken(token)

    if (decoded.email !== email) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email không khớp với token xác minh')
    }

    const user = await userModel.findOneByEmail(email)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Người dùng không tồn tại')
    }

    if (user.emailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tài khoản đã được xác minh trước đó')
    }

    const updatedUser = await userModel.update(user.id, {
      emailVerified: true,
      status: UserStatus.active
    })

    return {
      message: 'Xác minh tài khoản thành công',
      user: {
        _id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        emailVerified: updatedUser!.emailVerified,
        status: updatedUser!.status as UserStatus
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Gửi email quên mật khẩu
 * - Luôn trả message chung để tránh lộ email có tồn tại hay không
 */
const forgotPassword = async (email: string): Promise<ForgotPasswordResult> => {
  try {
    const user = await userModel.findOneByEmail(email)

    // Không tiết lộ email có tồn tại hay không
    if (!user) {
      return {
        message: FORGOT_PASSWORD_GENERIC_MESSAGE,
        expiresIn: '15 minutes'
      }
    }

    const resetToken = JwtProvider.generatePasswordResetToken(email)
    const decoded = JwtProvider.verifyPasswordResetToken(resetToken)

    // Lưu uuid để enforce one-time token
    await userModel.update(user.id, {
      activationToken: decoded.uuid
    })

    const resetLink = `${WEBSITE_DOMAIN}/reset-password?email=${encodeURIComponent(
      email
    )}&token=${encodeURIComponent(resetToken)}`

    const emailSubject = 'Đặt lại mật khẩu - Commerce Web'
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Đặt lại mật khẩu</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f6f9; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(90deg, #007bff, #0056b3); color: #ffffff; text-align: center; padding: 30px 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px 25px; line-height: 1.6; }
          .content h2 { margin-top: 0; color: #007bff; font-size: 20px; }
          .button { display: inline-block; background: #007bff; color: #ffffff !important; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-size: 16px; margin: 20px 0; }
          .link-box { background: #f1f3f5; padding: 12px; border-radius: 6px; font-size: 14px; word-break: break-all; }
          .footer { text-align: center; font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eaeaea; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Yêu cầu đặt lại mật khẩu</h1></div>
          <div class="content">
            <h2>Xin chào,</h2>
            <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản trên <strong>Commerce Web</strong>.</p>
            <p>Nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
            <div style="text-align: center;"><a href="${resetLink}" class="button">Đặt lại mật khẩu</a></div>
            <p>Nếu nút không hoạt động, sao chép link sau vào trình duyệt:</p>
            <div class="link-box">${resetLink}</div>
            <p><strong>Lưu ý:</strong> Link có hiệu lực trong 15 phút và chỉ dùng được 1 lần.</p>
            <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} Commerce Web. Mọi quyền được bảo lưu.</p></div>
        </div>
      </body>
      </html>
    `

    await BrevoProvider.sendEmail(email, emailSubject, emailContent)

    return {
      message: FORGOT_PASSWORD_GENERIC_MESSAGE,
      expiresIn: '15 minutes'
    }
  } catch (error) {
    // Không lộ thông tin chi tiết cho client ở luồng quên mật khẩu.
    // Log nội bộ để theo dõi lỗi vận hành (email provider, db, v.v.).
    console.error('❌ forgotPassword internal error:', (error as Error).message)

    return {
      message: FORGOT_PASSWORD_GENERIC_MESSAGE,
      expiresIn: '15 minutes'
    }
  }
}

/**
 * Đặt lại mật khẩu bằng reset token
 */
const resetPassword = async (resetData: ResetPasswordInput): Promise<ResetPasswordResult> => {
  try {
    const { email, token, newPassword } = resetData
    const decoded = JwtProvider.verifyPasswordResetToken(token)

    if (decoded.email !== email) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email không khớp với token đặt lại mật khẩu')
    }

    const user = await userModel.findOneByEmail(email)
    if (!user) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn')
    }

    // Enforce one-time token qua uuid đã lưu trong activationToken
    if (!user.activationToken || user.activationToken !== decoded.uuid) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Link đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng')
    }

    const hashedNewPassword = await hashPassword(newPassword)

    const updateData: { password: string; activationToken: null; typeAccount?: AccountType } = {
      password: hashedNewPassword,
      activationToken: null
    }

    // Nếu OAuth user lần đầu set password qua reset flow
    if (
      (user.typeAccount === AccountType.GOOGLE && user.password === 'GOOGLE-AUTH1*#') ||
      (user.typeAccount === AccountType.FACEBOOK && user.password === 'FACEBOOK-AUTH1*#')
    ) {
      updateData.typeAccount = AccountType.LOCAL
    }

    await userModel.update(user.id, updateData)

    // Thu hồi toàn bộ sessions cũ sau khi reset password
    await sessionModel.revokeAllUserSessions(user.id)

    return {
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.'
    }
  } catch (error) {
    throw error
  }
}

/**
 * Change user role (Admin only)
 * Không cho phép thay đổi role của chính mình hoặc của admin khác
 */
const changeUserRole = async (
  targetUserId: string,
  newRoleId: number,
  currentUserId: string
): Promise<{
  user: UserResponseType
  newRole: { id: number; name: string }
}> => {
  const adminRoleId = await getRoleIdByName(ROLE_NAMES.ADMIN)
  const targetId = parseUserId(targetUserId)
  const currentId = parseUserId(currentUserId)

  // Không cho thay đổi role của chính mình
  if (targetId === currentId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không thể thay đổi role của chính mình')
  }

  // Kiểm tra user tồn tại
  const user = await userModel.findOneById(targetId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy user')
  }

  // Kiểm tra role mới tồn tại
  const newRole = await roleModel.findById(newRoleId)
  if (!newRole) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Role không tồn tại')
  }

  // Không cho thay đổi role của admin khác (bảo vệ admin)
  if (user.roleId === adminRoleId && newRoleId !== adminRoleId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Không thể thay đổi role của admin khác')
  }

  // Cập nhật role
  const updatedUser = await userModel.update(targetId, {
    roleId: newRoleId
  })

  // Revoke all sessions to enforce new role immediately
  await sessionModel.revokeAllUserSessions(targetId)

  return {
    user: updatedUser as UserResponseType,
    newRole: { id: newRole.id, name: newRole.name }
  }
}

export const userService = {
  register,
  login,
  getDetails,
  updateUser,
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
  hashPassword,
  comparePassword,
  sendVerificationEmail,
  verifyUserAccount,
  forgotPassword,
  resetPassword,
  changeUserRole
}
