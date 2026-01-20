/**
 * Contact Service
 */

import { contactModel } from '~/models/contactModel.js'

/**
 * Gửi liên hệ
 */
const sendContact = async (data: {
  fullName: string
  email: string
  phoneNumber: string
  message: string
}) => {
  return await contactModel.create(data)
}

/**
 * Lấy danh sách contact (Admin)
 */
const getContacts = async (page: number, limit: number) => {
  return await contactModel.getMany(page, limit)
}

export const contactService = {
  sendContact,
  getContacts
}
