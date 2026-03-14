/**
 * Contact Model
 * Quản lý liên hệ/feedback từ user
 */

import { prisma } from '~/config/prisma.js'
import type { Contact } from '@prisma/client'

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
type ContactStatusFilter = 'all' | 'replied' | 'pending'

const getMany = async (
  page: number = 1,
  limit: number = 20,
  status: ContactStatusFilter = 'all'
) => {
  const skip = (page - 1) * limit
  const whereClause =
    status === 'replied'
      ? { isReply: true }
      : status === 'pending'
        ? { isReply: false }
        : undefined

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.contact.count({ where: whereClause })
  ])

  return {
    contacts,
    pagination: {
      page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  }
}

/**
 * Lấy chi tiết contact theo id
 */
const findById = async (id: number): Promise<Contact | null> => {
  return await prisma.contact.findUnique({
    where: { id }
  })
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
  findById,
  markAsReplied
}
