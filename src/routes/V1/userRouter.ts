/**
 * User Router
 * Định nghĩa các routes cho users, auth, sessions
 */

import express, { Router, RequestHandler } from 'express'
import { userController } from '~/controllers/userController.js'
import { userValidation } from '~/validations/userValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware.js'
import { WEBSITE_DOMAIN } from '~/utils/constants.js'
import passport from 'passport'

const RouterInstance: Router = express.Router()

// Public routes - không cần xác thực
RouterInstance.post('/register', userValidation.register, userController.register)
RouterInstance.post('/login', userValidation.login, userController.login as RequestHandler)
RouterInstance.post('/refresh-token', userController.refreshToken)

// Email verification routes
RouterInstance.post('/send-verification-email', userValidation.sendVerificationEmail, userController.sendVerificationEmail)
RouterInstance.get('/verify-account', userValidation.verifyUserAccount, userController.verifyUserAccount)

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
RouterInstance.post('/logout', authMiddleware.verifyTokenForLogout, userController.logout as RequestHandler)

// Protected routes - cần xác thực
RouterInstance.use(authMiddleware.verifyToken as RequestHandler)
RouterInstance.use(authMiddleware.verifySession as RequestHandler) // Kiểm tra session có còn active không

// Routes không yêu cầu active user
RouterInstance.get('/me', userController.getCurrentUser as RequestHandler)

// Admin routes - chỉ admin mới có quyền (admin luôn active)
RouterInstance.get('/all', authMiddleware.verifyAdmin as RequestHandler, userController.getUsers as RequestHandler)

// Lấy users với session summary cho table overview
RouterInstance.get('/overview', authMiddleware.verifyAdmin as RequestHandler, userController.getUsersWithSessionSummary as RequestHandler)

RouterInstance.post('/create', authMiddleware.verifyAdmin as RequestHandler, userValidation.createUserByAdmin, userController.createUserByAdmin as RequestHandler)

RouterInstance.get('/details/:id', authMiddleware.verifyUserOwnership as RequestHandler, userController.getDetails as RequestHandler)

RouterInstance.put('/update/:id', authMiddleware.verifyAdmin as RequestHandler, userValidation.updateUserByAdmin, userController.updateUserByAdmin as RequestHandler)

RouterInstance.delete('/delete/:id', authMiddleware.verifyAdmin as RequestHandler, userValidation.deleteUser, userController.deleteUser as RequestHandler)

RouterInstance.post('/delete-multiple', authMiddleware.verifyAdmin as RequestHandler, userValidation.deleteMultipleUsers, userController.deleteMultipleUsers as RequestHandler)

// User activation/deactivation routes - chỉ admin mới có quyền
RouterInstance.patch('/activate/:userId', authMiddleware.verifyAdmin as RequestHandler, userValidation.userActivation, userController.activateUser as RequestHandler)

RouterInstance.patch('/deactivate/:userId', authMiddleware.verifyAdmin as RequestHandler, userValidation.userActivation, userController.deactivateUser as RequestHandler)

// Session management routes - Admin
RouterInstance.post('/revoke-session', authMiddleware.verifyAdmin as RequestHandler, userValidation.revokeSession, userController.revokeUserSession as RequestHandler)

RouterInstance.delete(
  '/revoke-all-sessions/:userId',
  authMiddleware.verifyAdmin as RequestHandler,
  userValidation.revokeAllSessions,
  userController.revokeAllUserSessions as RequestHandler
)

RouterInstance.get('/sessions/:userId', authMiddleware.verifyAdmin as RequestHandler, userValidation.getUserSessions, userController.getUserSessions as RequestHandler)

// User routes - yêu cầu user phải active
RouterInstance.use(authMiddleware.verifyActiveUser as RequestHandler) // Bắt buộc user phải active

RouterInstance.put('/me', multerUploadMiddleware.upload.single('avatar'), userValidation.updateUser, userController.updateCurrentUser as RequestHandler)
RouterInstance.put('/me/password', userValidation.updatePassword, userController.updatePassword as RequestHandler)
RouterInstance.post('/upload-avatar', multerUploadMiddleware.upload.single('avatar'), userController.uploadAvatar as RequestHandler)

// Session management routes - User quản lý sessions của chính mình
RouterInstance.get('/my-sessions', userController.getCurrentUserSessions as RequestHandler)

RouterInstance.post('/revoke-my-session', userValidation.revokeMySession, userController.revokeMySession as RequestHandler)

export const userRoute = RouterInstance
