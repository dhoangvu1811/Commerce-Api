/**
 * Contact Controller
 */

import { StatusCodes } from 'http-status-codes'
import type { Request, Response, NextFunction } from 'express'
import { contactService } from '~/services/contactService.js'

/**
 * Gửi liên hệ
 */
const sendContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
const getContacts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsedPage = parseInt((req.query.page as string) || '1', 10)
    const parsedLimit = parseInt((req.query.limit as string) || '20', 10)

    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage
    const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100)

    const statusQuery = (req.query.status as string) || 'all'
    const status = statusQuery === 'replied' || statusQuery === 'pending' ? statusQuery : 'all'

    const result = await contactService.getContacts(page, limit, status)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách liên hệ thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Reply contact (Admin)
 */
const replyContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contactId = parseInt(req.params.id as string, 10)

    if (isNaN(contactId) || contactId < 1) {
      res.status(StatusCodes.BAD_REQUEST).json({
        code: StatusCodes.BAD_REQUEST,
        message: 'ID liên hệ không hợp lệ',
        data: null
      })

      return
    }

    const result = await contactService.replyContact(contactId, req.body)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Phản hồi liên hệ thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const contactController = {
  sendContact,
  getContacts,
  replyContact
}
