/**
 * User Model - Prisma Version
 * Quản lý dữ liệu người dùng
 */

import { prisma } from '~/config/prisma.js'
import type { User, Prisma } from '~/generated/prisma/index.js'
import { UserStatus, Gender, AccountType } from '~/generated/prisma/index.js'

/** User type export từ Prisma */
export type { User }
export { UserStatus, Gender, AccountType }

/** Paginated result cho users */
export interface PaginatedUsersResult {
  users: User[]
  pagination: {
    page: number
    itemsPerPage: number
    totalUsers: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/** Input tạo user mới */
export interface CreateUserInput {
  name: string
  email: string
  password: string
  phoneNumber?: string
  address?: string
  avatar?: string
  dateOfBirth?: Date | null
  gender?: Gender
  roleId: number
  emailVerified?: boolean
  typeAccount?: AccountType
  activationToken?: string | null
  googleId?: string | null
  status?: UserStatus
}

/** Input cập nhật user */
export interface UpdateUserInput {
  name?: string
  email?: string
  password?: string
  phoneNumber?: string
  address?: string
  avatar?: string
  dateOfBirth?: Date | null
  gender?: Gender
  roleId?: number
  emailVerified?: boolean
  typeAccount?: AccountType
  lastLogin?: Date | null
  activationToken?: string | null
  googleId?: string | null
  status?: UserStatus
}

/** Filter cho getMany */
export interface UserFilter {
  search?: string
  roleId?: number
  status?: UserStatus
}

/**
 * Tạo user mới
 */
const createNew = async (data: CreateUserInput): Promise<User> => {
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      password: data.password,
      phoneNumber: data.phoneNumber || null,
      address: data.address || null,
      avatar: data.avatar || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      roleId: data.roleId,
      emailVerified: data.emailVerified ?? false,
      typeAccount: data.typeAccount || AccountType.LOCAL,
      activationToken: data.activationToken || null,
      googleId: data.googleId || null,
      status: data.status || UserStatus.inactive
    },
    include: { role: true }
  })
  return user
}

/**
 * Tìm user theo ID
 */
const findOneById = async (userId: number): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  })
  return user
}

/**
 * Tìm user theo email
 */
const findOneByEmail = async (email: string): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { role: true }
  })
  return user
}

/**
 * Tìm nhiều users theo danh sách IDs
 */
const findByIds = async (userIds: number[]): Promise<User[]> => {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { role: true }
  })
  return users
}

/**
 * Lấy danh sách users với phân trang
 */
const getMany = async (
  filter: UserFilter = {},
  page: number = 1,
  itemsPerPage: number = 10,
  orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: 'desc' }
): Promise<PaginatedUsersResult> => {
  const skip = (page - 1) * itemsPerPage

  // Build where clause
  const where: Prisma.UserWhereInput = {}

  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search, mode: 'insensitive' } },
      { email: { contains: filter.search, mode: 'insensitive' } }
    ]
  }
  if (filter.roleId !== undefined) {
    where.roleId = filter.roleId
  }
  if (filter.status !== undefined) {
    where.status = filter.status
  }

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: itemsPerPage,
      include: { role: true }
    }),
    prisma.user.count({ where })
  ])

  const totalPages = Math.ceil(totalUsers / itemsPerPage)

  return {
    users,
    pagination: {
      page,
      itemsPerPage,
      totalUsers,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Cập nhật thông tin user
 */
const update = async (
  userId: number,
  updateData: UpdateUserInput
): Promise<User | null> => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { role: true }
    })
    return user
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // User không tồn tại
    }
    // Re-throw other errors (validation, constraint violations, etc.)
    throw error
  }
}

/**
 * Cập nhật thời gian đăng nhập cuối
 */
const updateLastLogin = async (userId: number): Promise<User | null> => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
      include: { role: true }
    })
    return user
  } catch {
    return null
  }
}

/**
 * Kích hoạt tài khoản user
 */
const activateUser = async (userId: number): Promise<User | null> => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.active },
      include: { role: true }
    })
    return user
  } catch {
    return null
  }
}

/**
 * Vô hiệu hóa tài khoản user
 */
const deactivateUser = async (userId: number): Promise<User | null> => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.inactive },
      include: { role: true }
    })
    return user
  } catch {
    return null
  }
}

/**
 * Tìm user active theo ID
 */
const findActiveUserById = async (userId: number): Promise<User | null> => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: UserStatus.active
    },
    include: { role: true }
  })
  return user
}

/**
 * Tìm user active theo email
 */
const findActiveUserByEmail = async (email: string): Promise<User | null> => {
  const user = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase().trim(),
      status: UserStatus.active
    },
    include: { role: true }
  })
  return user
}

/**
 * Xóa user theo ID
 */
const deleteOneById = async (userId: number): Promise<User | null> => {
  try {
    const user = await prisma.user.delete({
      where: { id: userId },
      include: { role: true }
    })
    return user
  } catch {
    return null
  }
}

/**
 * Xóa nhiều users theo filter
 * Safety: Yêu cầu ít nhất một điều kiện để tránh xóa nhầm tất cả users
 */
const deleteMany = async (
  where: Prisma.UserWhereInput = {}
): Promise<{ count: number }> => {
  // Safety check: Không cho phép xóa tất cả users nếu filter rỗng hoặc không có điều kiện thực sự
  const whereKeys = Object.keys(where)
  const hasCondition =
    whereKeys.length > 0 &&
    (where.id !== undefined ||
      where.email !== undefined ||
      where.roleId !== undefined ||
      where.status !== undefined ||
      where.OR !== undefined ||
      where.AND !== undefined ||
      where.NOT !== undefined)

  if (!hasCondition) {
    throw new Error(
      'Không thể xóa tất cả users. Vui lòng cung cấp ít nhất một điều kiện filter (id, email, roleId, status, OR, AND, hoặc NOT).'
    )
  }

  const result = await prisma.user.deleteMany({ where })
  return { count: result.count }
}

/**
 * Xóa nhiều users theo danh sách IDs
 */
const deleteManyByIds = async (
  userIds: number[]
): Promise<{ count: number }> => {
  const result = await prisma.user.deleteMany({
    where: { id: { in: userIds } }
  })
  return { count: result.count }
}

export const userModel = {
  createNew,
  findOneById,
  findOneByEmail,
  findByIds,
  getMany,
  update,
  updateLastLogin,
  activateUser,
  deactivateUser,
  findActiveUserById,
  findActiveUserByEmail,
  deleteOneById,
  deleteMany,
  deleteManyByIds
}
