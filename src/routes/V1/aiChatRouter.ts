import type { Router } from 'express'
import express from 'express'
import { aiChatController } from '~/controllers/aiChatController.js'
import { aiChatValidation } from '~/validations/aiChatValidation.js'
import { aiChatLimiter } from '~/middlewares/rateLimitMiddleware.js'

const router: Router = express.Router()

router.post('/', aiChatLimiter, aiChatValidation.chat, aiChatController.postChat)

export const aiChatRouter = router
