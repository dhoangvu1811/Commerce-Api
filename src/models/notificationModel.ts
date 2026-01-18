/**
 * Notification Model
 * Quản lý thông báo người dùng
 */

import { prisma } from '~/config/prisma.js'
import type { Notification } from '~/generated/prisma/index.js'

export type { Notification }

/**
 * create
 */
const create = async (data: {
  userId: number
  type: string
  message: string
}): Promise<Notification> => {
  return await prisma.notification.create({
    data
  })
}

/**
 * get by user id (paginated)
 */
const getByUserId = async (
  userId: number,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.notification.count({ where: { userId } })
  ])

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * count unread
 */
const countUnread = async (userId: number): Promise<number> => {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false
    }
  })
}

/**
 * mark as read
 */
const markAsRead = async (
  id: number,
  _userId: number
): Promise<Notification> => {
  // Verify ownership implicitly via where clause if needed, or check logic in service
  // Prisma updateMany could be used for safety but update is simpler if ID represents unique resource
  // Better to check owner in service or use updateMany with userId filter
  return await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  })
}

/**
 * mark all as read
 */
const markAllAsRead = async (userId: number): Promise<void> => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  })
}

export const notificationModel = {
  create,
  getByUserId,
  countUnread,
  markAsRead,
  markAllAsRead
}
