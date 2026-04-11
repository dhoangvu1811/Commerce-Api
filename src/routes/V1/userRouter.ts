/**
 * User Router
 * Định nghĩa các routes cho users, auth, sessions
 */

import type { Router } from 'express'
import express from 'express'
import { userController } from '~/controllers/userController.js'
import { userValidation } from '~/validations/userValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware.js'
import { authLimiter, emailLimiter } from '~/middlewares/rateLimitMiddleware.js'
import { WEBSITE_DOMAIN } from '~/utils/constants.js'
import passport from 'passport'
import { PERMISSIONS } from '~/constants/rbac.js'

const RouterInstance: Router = express.Router()

// Public routes - không cần xác thực (với rate limiting để bảo vệ khỏi brute force)
RouterInstance.post('/register', authLimiter, userValidation.register, userController.register)
RouterInstance.post('/login', authLimiter, userValidation.login, userController.login)
RouterInstance.post('/refresh-token', userController.refreshToken)

// Email verification routes (với rate limiting chặt hơn)
RouterInstance.post(
  '/send-verification-email',
  emailLimiter,
  userValidation.sendVerificationEmail,
  userController.sendVerificationEmail
)
RouterInstance.get('/verify-account', userValidation.verifyUserAccount, userController.verifyUserAccount)
RouterInstance.post('/forgot-password', emailLimiter, userValidation.forgotPassword, userController.forgotPassword)
RouterInstance.post('/reset-password', emailLimiter, userValidation.resetPassword, userController.resetPassword)

// Google OAuth routes
RouterInstance.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

RouterInstance.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${WEBSITE_DOMAIN}/auth/failure?error=oauth_failed`,
    failureMessage: true
  }),
  userController.googleOAuthSuccess
)

// Explicit Google failure route
RouterInstance.get('/auth/google/failure', userController.googleOAuthFailure)

// Facebook OAuth routes
RouterInstance.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }))

RouterInstance.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: `${WEBSITE_DOMAIN}/auth/failure?error=oauth_failed`,
    failureMessage: true
  }),
  userController.facebookOAuthSuccess
)

// Explicit Facebook failure route
RouterInstance.get('/auth/facebook/failure', userController.facebookOAuthFailure)

// Logout route - sử dụng middleware đặc biệt cho phép logout ngay cả khi AT hết hạn
RouterInstance.post('/logout', authMiddleware.verifyTokenForLogout, userController.logout)

// Protected routes - cần xác thực
RouterInstance.use(authMiddleware.verifyToken)
RouterInstance.use(authMiddleware.verifySession) // Kiểm tra session có còn active không

// Routes không yêu cầu active user
RouterInstance.get('/me', userController.getCurrentUser)

// Admin routes - requires manage_users permission
RouterInstance.get('/all', authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS), userController.getUsers)

// Lấy thống kê tổng quan người dùng cho dashboard
RouterInstance.get('/stats', authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS), userController.getUserOverviewStats)

// Lấy users với session summary cho table overview
RouterInstance.get(
  '/overview',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userController.getUsersWithSessionSummary
)

RouterInstance.post(
  '/create',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.createUserByAdmin,
  userController.createUserByAdmin
)

RouterInstance.get('/details/:id', authMiddleware.verifyUserOwnership, userController.getDetails)

RouterInstance.put(
  '/update/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.updateUserByAdmin,
  userController.updateUserByAdmin
)

RouterInstance.delete(
  '/delete/:id',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.deleteUser,
  userController.deleteUser
)

RouterInstance.post(
  '/delete-multiple',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.deleteMultipleUsers,
  userController.deleteMultipleUsers
)

// User activation/deactivation routes - requires manage_users permission
RouterInstance.patch(
  '/activate/:userId',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.userActivation,
  userController.activateUser
)

RouterInstance.patch(
  '/deactivate/:userId',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.userActivation,
  userController.deactivateUser
)

// Change user role route - requires manage_users permission
RouterInstance.patch(
  '/:id/role',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.changeUserRole,
  userController.changeUserRole
)

// Session management routes - requires manage_users permission
RouterInstance.post(
  '/revoke-session',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.revokeSession,
  userController.revokeUserSession
)

RouterInstance.delete(
  '/revoke-all-sessions/:userId',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.revokeAllSessions,
  userController.revokeAllUserSessions
)

RouterInstance.get(
  '/sessions/:userId',
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_USERS),
  userValidation.getUserSessions,
  userController.getUserSessions
)

// User routes - yêu cầu user phải active
RouterInstance.use(authMiddleware.verifyActiveUser) // Bắt buộc user phải active

RouterInstance.put(
  '/me',
  multerUploadMiddleware.upload.single('avatar'),
  userValidation.updateUser,
  userController.updateCurrentUser
)
RouterInstance.put('/me/password', userValidation.updatePassword, userController.updatePassword)
RouterInstance.post('/upload-avatar', multerUploadMiddleware.upload.single('avatar'), userController.uploadAvatar)

// Session management routes - User quản lý sessions của chính mình
RouterInstance.get('/my-sessions', userController.getCurrentUserSessions)

RouterInstance.post('/revoke-my-session', userValidation.revokeMySession, userController.revokeMySession)

export const userRoute = RouterInstance
