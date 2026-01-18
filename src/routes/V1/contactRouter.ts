/**
 * Contact Routes
 */

import type { Router } from 'express'
import express from 'express'
import { contactController } from '~/controllers/contactController.js'
import { contactValidation } from '~/validations/contactValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const router: Router = express.Router()

// Public: Gửi liên hệ
router.post('/', contactValidation.createContact, contactController.sendContact)

// Protected (Admin): Xem danh sách liên hệ
router.get('/', authMiddleware.verifyToken, contactController.getContacts)

export const contactRouter = router
