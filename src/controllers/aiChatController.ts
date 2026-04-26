import { StatusCodes } from 'http-status-codes'
import type { Request, Response, NextFunction } from 'express'
import { aiChatService } from '~/services/aiChatService.js'
import type { AiChatPayload } from '~/types/aiChat.types.js'

const postChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = req.body as AiChatPayload
    const result = await aiChatService.sendChatMessage(payload)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'OK',
      data: {
        reply: result.reply,
        sources: result.sources
      }
    })
  } catch (e) {
    next(e)
  }
}

export const aiChatController = {
  postChat
}
