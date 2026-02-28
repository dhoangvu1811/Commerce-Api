/**
 * Notification Controller
 */

import { StatusCodes } from 'http-status-codes'
import type { Request, Response, NextFunction } from 'express'
import { notificationService } from '~/services/notificationService.js'

/**
 * Lấy thông báo
 */
const getMyNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const page = parseInt((req.query.page as string) || '1', 10)
    const limit = parseInt((req.query.limit as string) || '20', 10)

    const result = await notificationService.getMyNotifications(
      userId,
      page,
      limit
    )

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy thông báo thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Đánh dấu đã đọc 1 cái
 */
const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const notificationId = parseInt(req.params.id as string, 10)

    await notificationService.markAsRead(userId, notificationId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đã đánh dấu đã đọc'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Đánh dấu tất cả đã đọc
 */
const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    await notificationService.markAllAsRead(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đã đánh dấu tất cả đã đọc'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Xoá 1 thông báo
 */
const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const notificationId = parseInt(req.params.id as string, 10)

    await notificationService.deleteNotification(userId, notificationId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Đã xoá thông báo'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Xoá tất cả thông báo đã đọc
 */
const deleteAllRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.jwtDecoded!._id as string, 10)
    const result = await notificationService.deleteAllRead(userId)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: `Đã xoá ${result.deletedCount} thông báo đã đọc`,
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const notificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
}
