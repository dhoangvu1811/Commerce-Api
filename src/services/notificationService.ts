import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { notificationModel } from '~/models/notificationModel.js'
import { prisma } from '~/config/prisma.js'
import { emitToUser, SOCKET_EVENTS } from '~/config/socket.js'
import { ROLES } from '~/constants/rbac.js'

/**
 * Tạo thông báo cho user cụ thể (Internal use for triggers)
 * Tự động emit realtime notification đến user qua Socket.IO
 */
const createNotification = async (userId: number, type: string, message: string) => {
  const notification = await notificationModel.create({ userId, type, message })

  // Emit realtime notification đến user
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, {
    id: notification.id,
    type,
    message,
    isRead: false,
    createdAt: notification.createdAt
  })

  return notification
}

/**
 * Tạo thông báo cho tất cả admin/staff
 * Mỗi admin/staff nhận 1 bản ghi riêng trong DB + realtime socket event
 * @param excludeUserId - Loại trừ admin đang thao tác (tránh self-notification)
 */
const createAdminNotification = async (type: string, message: string, excludeUserId?: number) => {
  // Tìm tất cả admin và staff
  const adminUsers = await prisma.user.findMany({
    where: {
      role: {
        name: { in: [ROLES.ADMIN, ROLES.STAFF] }
      }
    },
    select: { id: true }
  })

  // Loại trừ admin đang thao tác (nếu có)
  const targetAdmins = excludeUserId ? adminUsers.filter(u => u.id !== excludeUserId) : adminUsers

  if (targetAdmins.length === 0) return

  // Tạo notification + emit theo từng admin để payload luôn có ID thật.
  await Promise.allSettled(
    targetAdmins.map(admin => createNotification(admin.id, type, message))
  )
}

/**
 * Láy thông báo của user
 */
const getMyNotifications = async (userId: number, page: number, limit: number) => {
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

/**
 * Xoá 1 thông báo
 */
const deleteNotification = async (userId: number, notificationId: number) => {
  // Kiểm tra ownership
  const count = await prisma.notification.count({
    where: {
      id: notificationId,
      userId
    }
  })

  if (count === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Thông báo không tồn tại')
  }

  await notificationModel.deleteOne(notificationId)
}

/**
 * Xoá tất cả thông báo đã đọc
 */
const deleteAllRead = async (userId: number) => {
  const deletedCount = await notificationModel.deleteAllRead(userId)

  return { deletedCount }
}

export const notificationService = {
  createNotification,
  createAdminNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
}
