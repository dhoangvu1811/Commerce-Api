import type { Router } from 'express'
import express from 'express'
import { aiChatController } from '~/controllers/aiChatController.js'
import { aiChatValidation } from '~/validations/aiChatValidation.js'
import { aiChatLimiter } from '~/middlewares/rateLimitMiddleware.js'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware.js'

const router: Router = express.Router()

// Unified chat — accepts optional image via multipart/form-data
// Khi có ảnh: Commerce-Api gọi image search → gom context → gửi n8n
// Khi không có ảnh: chỉ gửi text message cho n8n (như cũ)
router.post(
  '/',
  aiChatLimiter,
  multerUploadMiddleware.upload.single('image'),
  aiChatValidation.chat,
  aiChatController.postChat
)

export const aiChatRouter = router
