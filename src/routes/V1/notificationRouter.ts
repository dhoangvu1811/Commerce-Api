/**
 * Notification Routes
 */

import type { Router } from 'express'
import express from 'express'
import { notificationController } from '~/controllers/notificationController.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const router: Router = express.Router()

// All routes protected
router.use(authMiddleware.verifyToken)

router.get('/', notificationController.getMyNotifications)
router.patch('/read-all', notificationController.markAllAsRead)
router.patch('/:id/read', notificationController.markAsRead)

export const notificationRouter = router
