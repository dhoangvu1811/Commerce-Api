/**
 * Contact Controller
 */

import { StatusCodes } from 'http-status-codes'
import type { Request, Response, NextFunction } from 'express'
import { contactService } from '~/services/contactService.js'

/**
 * Gửi liên hệ
 */
const sendContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await contactService.sendContact(req.body)

    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Gửi liên hệ thành công. Chúng tôi sẽ phản hồi sớm nhất!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get contacts (Admin/Internal use)
 */
const getContacts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10)
    const limit = parseInt((req.query.limit as string) || '20', 10)

    const result = await contactService.getContacts(page, limit)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách liên hệ thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const contactController = {
  sendContact,
  getContacts
}
