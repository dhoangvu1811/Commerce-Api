/* eslint-disable indent */
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { userModel } from '~/models/userModel'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcrypt'
import { JwtProvider } from '~/providers/JwtProvider'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

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

const login = async (loginData) => {
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

    // Kiểm tra tài khoản có bị khóa không
    if (!user.isActive) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Tài khoản của bạn đã bị khóa')
    }

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

    // Tạo token
    const accessToken = JwtProvider.generateAccessToken(user)
    const refreshToken = JwtProvider.generateRefreshToken(user)

    // Loại bỏ password khỏi response
    // eslint-disable-next-line no-unused-vars
    const { password: userPassword, ...userResponse } = user

    return {
      user: userResponse,
      accessToken,
      refreshToken
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

    // Kiểm tra mật khẩu hiện tại
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

    // Hash mật khẩu mới
    const hashedNewPassword = await hashPassword(passwordData.newPassword)

    // Cập nhật mật khẩu
    const updatedUser = await userModel.update(userId, {
      password: hashedNewPassword,
      updatedAt: new Date()
    })

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
    const usersWithoutPassword = result.users?.map((user) => {
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

    // Tìm user
    const user = await userModel.findOneById(decoded._id)

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token không hợp lệ')
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.isActive) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Tài khoản của bạn đã bị khóa')
    }

    // Tạo access token mới
    const newAccessToken = JwtProvider.generateAccessToken(user)

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
  hashPassword,
  comparePassword
}
