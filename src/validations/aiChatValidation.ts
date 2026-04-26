import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'

const chatSchema = z.object({
  message: z
    .string({ required_error: 'Nội dung tin nhắn là bắt buộc' })
    .min(1, 'Tin nhắn không được để trống')
    .max(4000, 'Tin nhắn quá dài'),
  conversationId: z.string().max(128).optional(),
  productId: z.number().int().positive().optional(),
  locale: z.string().max(16).optional()
})

const validateChat = (req: Request, _res: Response, next: NextFunction): void => {
  const parsed = chatSchema.safeParse(req.body)
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join('; ')
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, msg))
    
    return
  }
  req.body = parsed.data
  next()
}

export const aiChatValidation = {
  chat: validateChat
}
