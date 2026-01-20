/**
 * Contact Model
 * Quản lý liên hệ/feedback từ user
 */

import { prisma } from '~/config/prisma.js'
import type { Contact } from '~/generated/prisma/index.js'

/**
 * Tạo mới contact
 */
const create = async (data: {
  fullName: string
  email: string
  phoneNumber: string
  message: string
}): Promise<Contact> => {
  return await prisma.contact.create({
    data
  })
}

/**
 * Lấy danh sách contact (cho Admin)
 */
const getMany = async (page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit
  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.contact.count()
  ])

  return {
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Đánh dấu đã trả lời (không có field reply trong DB, chỉ có isReply)
 */
const markAsReplied = async (id: number): Promise<Contact> => {
  return await prisma.contact.update({
    where: { id },
    data: { isReply: true }
  })
}

export const contactModel = {
  create,
  getMany,
  markAsReplied
}
