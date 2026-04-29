import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'

const chatSchema = z.object({
  message: z
    .string()
    .max(4000, 'Tin nhắn quá dài')
    .optional()
    .default(''),
  conversationId: z.string().max(128).optional(),
  productId: z
    .union([z.number(), z.string()])
    .optional()
    .transform(v => {
      if (v === undefined || v === null || v === '') return undefined
      const n = Number(v)
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined
    }),
  locale: z.string().max(16).optional()
})

const validateChat = (req: Request, _res: Response, next: NextFunction): void => {
  const parsed = chatSchema.safeParse(req.body)
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join('; ')
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, msg))
    
    return
  }

  // At least message or image must be present
  if (!parsed.data.message && !req.file) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, 'Cần nhập tin nhắn hoặc đính kèm ảnh'))
    return
  }

  req.body = parsed.data
  next()
}

export const aiChatValidation = {
  chat: validateChat
}
