import express from 'express'
import { userController } from '~/controllers/userController'
import { userValidation } from '~/validations/userValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import passport from 'passport'

const Router = express.Router()

// Public routes - không cần xác thực
Router.post('/register', userValidation.register, userController.register)
Router.post('/login', userValidation.login, userController.login)
Router.post('/refresh-token', userController.refreshToken)

// Email verification routes
Router.post(
  '/send-verification-email',
  userValidation.sendVerificationEmail,
  userController.sendVerificationEmail
)
Router.get(
  '/verify-account',
  userValidation.verifyUserAccount,
  userController.verifyUserAccount
)

// Google OAuth routes
Router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

Router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${WEBSITE_DOMAIN}/auth/failure?error=oauth_failed`,
    failureMessage: true
  }),
  userController.googleOAuthSuccess
)

// Explicit Google failure route
Router.get('/auth/google/failure', userController.googleOAuthFailure)

// Facebook OAuth routes
Router.get(
  '/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
)

Router.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: `${WEBSITE_DOMAIN}/auth/failure?error=oauth_failed`,
    failureMessage: true
  }),
  userController.facebookOAuthSuccess
)

// Explicit Facebook failure route
Router.get('/auth/facebook/failure', userController.facebookOAuthFailure)

// Protected routes - cần xác thực
Router.use(authMiddleware.verifyToken)
Router.post('/logout', userController.logout)
Router.use(authMiddleware.verifySession) // Kiểm tra session có còn active không

Router.get('/me', userController.getCurrentUser)
// User routes - user có thể truy cập thông tin của chính mình (cần active)
Router.use(authMiddleware.verifyActiveUser) // Bắt buộc user phải active

Router.put(
  '/me',
  multerUploadMiddleware.upload.single('avatar'),
  userValidation.updateUser,
  userController.updateCurrentUser
)
Router.put(
  '/me/password',
  userValidation.updatePassword,
  userController.updatePassword
)
Router.post(
  '/upload-avatar',
  multerUploadMiddleware.upload.single('avatar'),
  userController.uploadAvatar
)

// Admin routes - chỉ admin mới có quyền
Router.get('/all', authMiddleware.verifyAdmin, userController.getUsers)

// Lấy users với session summary cho table overview
Router.get(
  '/overview',
  authMiddleware.verifyAdmin,
  userController.getUsersWithSessionSummary
)

Router.post(
  '/create',
  authMiddleware.verifyAdmin,
  userValidation.createUserByAdmin,
  userController.createUserByAdmin
)

Router.get(
  '/details/:id',
  authMiddleware.verifyUserOwnership,
  userController.getDetails
)

Router.put(
  '/update/:id',
  authMiddleware.verifyAdmin,
  userValidation.updateUserByAdmin,
  userController.updateUserByAdmin
)

Router.delete(
  '/delete/:id',
  authMiddleware.verifyAdmin,
  userValidation.deleteUser,
  userController.deleteUser
)

Router.post(
  '/delete-multiple',
  authMiddleware.verifyAdmin,
  userValidation.deleteMultipleUsers,
  userController.deleteMultipleUsers
)

// User activation/deactivation routes - chỉ admin mới có quyền
Router.patch(
  '/activate/:userId',
  authMiddleware.verifyAdmin,
  userValidation.userActivation,
  userController.activateUser
)

Router.patch(
  '/deactivate/:userId',
  authMiddleware.verifyAdmin,
  userValidation.userActivation,
  userController.deactivateUser
)

// Session management routes

// Admin routes - quản lý sessions
Router.post(
  '/revoke-session',
  authMiddleware.verifyAdmin,
  userValidation.revokeSession,
  userController.revokeUserSession
)

Router.delete(
  '/revoke-all-sessions/:userId',
  authMiddleware.verifyAdmin,
  userValidation.revokeAllSessions,
  userController.revokeAllUserSessions
)

Router.get(
  '/sessions/:userId',
  authMiddleware.verifyAdmin,
  userValidation.getUserSessions,
  userController.getUserSessions
)

// User routes - quản lý sessions của chính mình
Router.get(
  '/my-sessions',
  authMiddleware.verifyToken,
  authMiddleware.verifySession,
  userController.getCurrentUserSessions
)

export const userRoute = Router
