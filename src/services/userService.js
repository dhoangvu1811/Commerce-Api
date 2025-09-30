/* eslint-disable indent */
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'
import { sessionModel } from '~/models/sessionModel'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcrypt'
import { JwtProvider } from '~/providers/JwtProvider'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { BrevoProvider } from '~/providers/BrevoProvider'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import { v4 as uuidv4 } from 'uuid'
import ms from 'ms'
import { env } from '~/config/environment'

// Hash mật khẩu
const hashPassword = async (password) => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// So sánh mật khẩu
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword)
}

const register = async (userData) => {
  try {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await userModel.findOneByEmail(userData.email)

    if (existingUser) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Email "${userData.email}" đã được sử dụng`
      )
    }

    // Hash mật khẩu
    const hashedPassword = await hashPassword(userData.password)

    // Tạo user mới
    const newUser = {
      ...userData,
      password: hashedPassword,
      typeAccount: 'LOCAL', // Set mặc định cho user đăng ký thông thường
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Loại bỏ confirmPassword trước khi lưu
    delete newUser.confirmPassword

    const createdUser = await userModel.createNew(newUser)

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password, ...userResponse } = createdUser

    return { user: userResponse }
  } catch (error) {
    throw error
  }
}

const login = async (loginData, deviceInfo = '', ipAddress = '') => {
  try {
    const { email, password } = loginData

    // Tìm user theo email
    const user = await userModel.findOneByEmail(email)

    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_ACCEPTABLE,
        'Email hoặc mật khẩu không đúng'
      )
    }

    // Lưu ý: User inactive vẫn có thể đăng nhập để xem sản phẩm
    // Không chặn login dựa trên isActive nữa

    // So sánh mật khẩu
    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      throw new ApiError(
        StatusCodes.NOT_ACCEPTABLE,
        'Email hoặc mật khẩu không đúng'
      )
    }

    // Cập nhật thời gian đăng nhập cuối
    await userModel.updateLastLogin(user._id)

    // Tạo sessionId unique
    const sessionId = uuidv4()

    // Tạo token với sessionId
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
      deviceInfo,
      ipAddress,
      expiresAt
    })

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password: userPassword, ...userResponse } = user

    return {
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId // Trả về sessionId cho client debug (optional)
    }
  } catch (error) {
    throw error
  }
}

const getDetails = async (userId) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID người dùng không hợp lệ')
    }

    const user = await userModel.findOneById(userId)

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Không tìm thấy người dùng')
    }

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password, ...userResponse } = user || {}

    return { user: userResponse }
  } catch (error) {
    throw error
  }
}

const updateUser = async (userId, updateData) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID người dùng không hợp lệ')
    }

    // Kiểm tra user có tồn tại không
    const existingUser = await userModel.findOneById(userId)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Cập nhật user
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    }

    const updatedUser = await userModel.update(userId, dataToUpdate)

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password, ...userResponse } = updatedUser || {}

    return { user: userResponse }
  } catch (error) {
    throw error
  }
}

const updateUserByAdmin = async (userId, updateData) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID người dùng không hợp lệ')
    }

    // Kiểm tra user có tồn tại không
    const existingUser = await userModel.findOneById(userId)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Kiểm tra duplicate email nếu có thay đổi email
    if (updateData.email && updateData.email !== existingUser.email) {
      const duplicateUser = await userModel.findOneByEmail(updateData.email)
      if (duplicateUser) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Email "${updateData.email}" đã được sử dụng`
        )
      }
    }

    // Cập nhật user
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    }

    const updatedUser = await userModel.update(userId, dataToUpdate)

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password, ...userResponse } = updatedUser || {}

    return { user: userResponse }
  } catch (error) {
    throw error
  }
}

const updatePassword = async (userId, passwordData) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID người dùng không hợp lệ')
    }

    // Tìm user
    const user = await userModel.findOneById(userId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Kiểm tra mật khẩu hiện tại chỉ khi KHÔNG phải OAuth user (Google/Facebook) chưa set password
    const isOAuthUser =
      user.typeAccount === 'GOOGLE' || user.typeAccount === 'FACEBOOK'
    const hasOAuthPassword =
      user.password === 'GOOGLE-AUTH1*#' || user.password === 'FACEBOOK-AUTH1*#'
    if (!isOAuthUser || (isOAuthUser && !hasOAuthPassword)) {
      const isCurrentPasswordValid = await comparePassword(
        passwordData.currentPassword,
        user.password
      )

      if (!isCurrentPasswordValid) {
        throw new ApiError(
          StatusCodes.NOT_ACCEPTABLE,
          'Mật khẩu hiện tại không đúng'
        )
      }
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await hashPassword(passwordData.newPassword)

    // Cập nhật mật khẩu và typeAccount
    const updateData = {
      password: hashedNewPassword,
      updatedAt: new Date()
    }

    // Nếu OAuth user lần đầu set password, chuyển về LOCAL để có thể login bằng cả 2 cách
    if (
      (user.typeAccount === 'GOOGLE' && user.password === 'GOOGLE-AUTH1*#') ||
      (user.typeAccount === 'FACEBOOK' && user.password === 'FACEBOOK-AUTH1*#')
    ) {
      updateData.typeAccount = 'LOCAL'
    }

    const updatedUser = await userModel.update(userId, updateData)

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password, ...userResponse } = updatedUser || {}

    return { user: userResponse }
  } catch (error) {
    throw error
  }
}

const deleteUser = async (userId) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'ID người dùng không hợp lệ')
    }

    // Kiểm tra user có tồn tại không
    const existingUser = await userModel.findOneById(userId)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Xóa user
    const result = await userModel.deleteOneById(userId)

    return result
  } catch (error) {
    throw error
  }
}

const deleteMultipleUsers = async (userIds) => {
  try {
    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Danh sách ID người dùng không hợp lệ'
      )
    }

    // Validate tất cả ObjectIds
    const invalidIds = userIds.filter((id) => !ObjectId.isValid(id))
    if (invalidIds.length > 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `ID người dùng không hợp lệ: ${invalidIds.join(', ')}`
      )
    }

    // Chuyển đổi string IDs thành ObjectIds
    const objectIds = userIds.map((id) => new ObjectId(id))

    // Kiểm tra các user có tồn tại không
    const existingUsers = await userModel.findByIds(objectIds)
    const existingIds = existingUsers.map((user) => user?._id?.toString())
    const notFoundIds = userIds.filter((id) => !existingIds.includes(id))

    if (notFoundIds.length > 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Không tìm thấy người dùng với ID: ${notFoundIds.join(', ')}`
      )
    }

    // Xóa các user đã chọn
    const result = await userModel.deleteManyByIds(userIds)

    return {
      deletedCount: result.deletedCount,
      message: `Đã xóa ${result.deletedCount} người dùng được chọn`,
      deletedIds: userIds
    }
  } catch (error) {
    throw error
  }
}

const getUsers = async (page = 1, itemsPerPage = 10, queryFilter = {}) => {
  try {
    const { search, role, isActive, sort } = queryFilter

    // Tạo filter object
    const filter = {}

    // Tìm kiếm theo tên hoặc email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // Lọc theo role
    if (role) {
      filter.role = role
    }

    // Lọc theo trạng thái hoạt động
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }

    // Tạo sort object
    let sortOptions = { createdAt: -1 } // Mặc định sắp xếp theo ngày tạo mới nhất

    if (sort) {
      switch (sort) {
        case 'name_asc':
          sortOptions = { name: 1 }
          break
        case 'name_desc':
          sortOptions = { name: -1 }
          break
        case 'email_asc':
          sortOptions = { email: 1 }
          break
        case 'email_desc':
          sortOptions = { email: -1 }
          break
        case 'lastLogin_desc':
          sortOptions = { lastLogin: -1 }
          break
        case 'lastLogin_asc':
          sortOptions = { lastLogin: 1 }
          break
        default:
          sortOptions = { createdAt: -1 }
      }
    }

    const result = await userModel.getMany(
      filter,
      parseInt(page),
      parseInt(itemsPerPage),
      sortOptions
    )

    // Loại bỏ password khỏi tất cả user trong response
    const usersWithoutPassword =
      result.users?.map((user) => {
        // eslint-disable-next-line no-unused-vars
        const { password, ...userWithoutPassword } = user || {}
        return userWithoutPassword
      }) || []

    return {
      ...result,
      users: usersWithoutPassword
    }
  } catch (error) {
    throw error
  }
}

const refreshToken = async (refreshTokenValue) => {
  try {
    // Verify refresh token
    const decoded = JwtProvider.verifyRefreshToken(refreshTokenValue)

    // Kiểm tra sessionId từ refresh token
    const sessionId = decoded.sessionId

    if (sessionId) {
      // Kiểm tra session có còn active không
      const activeSession = await sessionModel.findBySessionId(sessionId)

      if (!activeSession) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Phiên đăng nhập đã bị thu hồi hoặc hết hạn. Vui lòng đăng nhập lại.'
        )
      }

      // Kiểm tra session có khớp với user không
      if (activeSession.userId !== decoded._id) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Phiên đăng nhập không hợp lệ'
        )
      }
    }

    // Tìm user
    const user = await userModel.findOneById(decoded._id)

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token không hợp lệ')
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.isActive) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Tài khoản của bạn đã bị khóa')
    }

    // Tạo access token mới với sessionId (nếu có)
    const newAccessToken = JwtProvider.generateAccessToken(user, sessionId)

    return {
      accessToken: newAccessToken
    }
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Token không hợp lệ hoặc đã hết hạn'
      )
    }
    throw error
  }
}

const createUserByAdmin = async (userData) => {
  try {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await userModel.findOneByEmail(userData.email)

    if (existingUser) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Email "${userData.email}" đã được sử dụng`
      )
    }

    // Hash mật khẩu
    const hashedPassword = await hashPassword(userData.password)

    // Tạo user mới với dữ liệu từ admin
    const newUser = {
      ...userData,
      password: hashedPassword,
      role: userData.role || 'user',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      emailVerified:
        userData.emailVerified !== undefined ? userData.emailVerified : false,
      typeAccount: userData.typeAccount || 'LOCAL', // Admin có thể chỉ định loại account
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const createdUser = await userModel.createNew(newUser)

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password, ...userResponse } = createdUser

    return { user: userResponse }
  } catch (error) {
    throw error
  }
}

const uploadAvatar = async (fileBuffer, folderName = 'users-commerceweb') => {
  try {
    // Upload ảnh lên Cloudinary với folder 'users-commerceweb'
    const uploadResult = await CloudinaryProvider.streamUpload(
      fileBuffer,
      folderName
    )

    return uploadResult
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Lỗi upload ảnh lên Cloudinary: ${error.message}`
    )
  }
}

const activateUser = async (userId) => {
  try {
    // Kiểm tra user có tồn tại không
    const existingUser = await userModel.findOneById(userId)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Kiểm tra user đã được kích hoạt chưa
    if (existingUser.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Tài khoản đã được kích hoạt trước đó'
      )
    }

    // Kích hoạt user
    const activatedUser = await userModel.activateUser(userId)
    if (!activatedUser) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Không thể kích hoạt tài khoản'
      )
    }

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password, ...userResponse } = activatedUser

    return { user: userResponse }
  } catch (error) {
    throw error
  }
}

const deactivateUser = async (userId) => {
  try {
    // Kiểm tra user có tồn tại không
    const existingUser = await userModel.findOneById(userId)
    if (!existingUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy người dùng')
    }

    // Kiểm tra user có phải admin không (admin không thể bị vô hiệu hóa)
    if (existingUser.role === 'admin') {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Không thể vô hiệu hóa tài khoản quản trị viên'
      )
    }

    // Kiểm tra user đã bị vô hiệu hóa chưa
    if (!existingUser.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Tài khoản đã bị vô hiệu hóa trước đó'
      )
    }

    // Vô hiệu hóa user
    const deactivatedUser = await userModel.deactivateUser(userId)
    if (!deactivatedUser) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Không thể vô hiệu hóa tài khoản'
      )
    }

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password, ...userResponse } = deactivatedUser

    return { user: userResponse }
  } catch (error) {
    throw error
  }
}

// Gửi email xác minh tài khoản
const sendVerificationEmail = async (email) => {
  try {
    // Kiểm tra user có tồn tại không
    const user = await userModel.findOneByEmail(email)
    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Email không tồn tại trong hệ thống'
      )
    }

    // Kiểm tra user đã verify chưa
    if (user.emailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tài khoản đã được xác minh')
    }

    // Tạo verification token sử dụng JwtProvider
    const verifyToken = JwtProvider.generateVerificationToken(email)

    // Tạo verification link
    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${encodeURIComponent(
      email
    )}&token=${verifyToken}`

    // HTML email template
    const emailSubject = 'Xác minh tài khoản - Commerce Web'
    const emailContent = `
        <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Xác minh tài khoản</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f6f9;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(90deg, #007bff, #0056b3);
          color: #ffffff;
          text-align: center;
          padding: 30px 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 25px;
          line-height: 1.6;
        }
        .content h2 {
          margin-top: 0;
          color: #007bff;
          font-size: 20px;
        }
        .button {
          display: inline-block;
          background: #007bff;
          color: #ffffff !important;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 6px;
          font-size: 16px;
          margin: 20px 0;
          transition: background 0.3s;
        }
        .button:hover {
          background: #0056b3;
        }
        .link-box {
          background: #f1f3f5;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          word-break: break-all;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          padding: 20px;
          border-top: 1px solid #eaeaea;
          background: #fafafa;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Xác minh tài khoản của bạn</h1>
        </div>
        <div class="content">
          <h2>Xin chào,</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Commerce Web</strong>.</p>
          <p>Để hoàn tất đăng ký, vui lòng nhấp vào nút bên dưới để xác minh địa chỉ email:</p>

          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Xác minh ngay</a>
          </div>

          <p>Nếu nút trên không hoạt động, bạn có thể sao chép và dán đường link sau vào trình duyệt của mình:</p>
          <div class="link-box">
            ${verificationLink}
          </div>

          <p><strong>Lưu ý:</strong></p>
          <ul>
            <li>Link xác minh có hiệu lực trong vòng <strong>24 giờ</strong>.</li>
            <li>Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</li>
          </ul>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Commerce Web. Mọi quyền được bảo lưu.</p>
        </div>
      </div>
    </body>
    </html>
    `

    // Gửi email
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

// Xác minh tài khoản người dùng
const verifyUserAccount = async (email, token) => {
  try {
    // Xác minh token sử dụng JwtProvider
    const decoded = JwtProvider.verifyVerificationToken(token)

    // Kiểm tra email khớp với token
    if (decoded.email !== email) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Email không khớp với token xác minh'
      )
    }

    // Tìm user
    const user = await userModel.findOneByEmail(email)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Người dùng không tồn tại')
    }

    // Kiểm tra đã verify chưa
    if (user.emailVerified) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Tài khoản đã được xác minh trước đó'
      )
    }

    // Cập nhật trạng thái emailVerified và isActive
    const updatedUser = await userModel.update(user._id, {
      emailVerified: true,
      isActive: true,
      updatedAt: new Date()
    })

    return {
      message: 'Xác minh tài khoản thành công',
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        emailVerified: updatedUser.emailVerified,
        isActive: updatedUser.isActive
      }
    }
  } catch (error) {
    throw error
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
  verifyUserAccount
}
