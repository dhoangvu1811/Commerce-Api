/**
 * Contact Routes
 */

import type { Router } from 'express'
import express from 'express'
import { contactController } from '~/controllers/contactController.js'
import { contactValidation } from '~/validations/contactValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { contactLimiter } from '~/middlewares/rateLimitMiddleware.js'

import { PERMISSIONS } from '~/constants/rbac.js'

const router: Router = express.Router()

// Public: Gửi liên hệ
router.post('/', contactLimiter, contactValidation.createContact, contactController.sendContact)

// Protected (Admin): Xem danh sách liên hệ - requires manage_contacts permission
router.get(
  '/',
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_CONTACTS),
  contactController.getContacts
)

// Protected (Admin): Reply contact - requires manage_contacts permission
router.post(
  '/:id/reply',
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_CONTACTS),
  contactValidation.replyContact,
  contactController.replyContact
)

export const contactRouter = router
