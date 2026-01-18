import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { notificationModel } from '~/models/notificationModel.js'
import { prisma } from '~/config/prisma.js'

/**
 * Tạo thông báo (Internal use for triggers)
 */
const createNotification = async (
  userId: number,
  type: string,
  message: string
) => {
  return await notificationModel.create({ userId, type, message })
}

/**
 * Láy thông báo của user
 */
const getMyNotifications = async (
  userId: number,
  page: number,
  limit: number
) => {
  const [data, unreadCount] = await Promise.all([
    notificationModel.getByUserId(userId, page, limit),
    notificationModel.countUnread(userId)
  ])

  return {
    ...data,
    unreadCount
  }
}

/**
 * Đánh dấu đã đọc
 */
const markAsRead = async (userId: number, notificationId: number) => {
  // Check ownership
  const count = await prisma.notification.count({
    where: {
      id: notificationId,
      userId
    }
  })

  if (count === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Thông báo không tồn tại')
  }

  return await notificationModel.markAsRead(notificationId, userId)
}

/**
 * Đánh dấu tất cả đã đọc
 */
const markAllAsRead = async (userId: number) => {
  await notificationModel.markAllAsRead(userId)
}

export const notificationService = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead
}
