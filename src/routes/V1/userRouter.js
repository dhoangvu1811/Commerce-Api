import express from 'express'
import { userController } from '~/controllers/userController'
import { userValidation } from '~/validations/userValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { env } from '~/config/environment'
import passport from 'passport'

const Router = express.Router()

// Public routes - không cần xác thực
Router.post('/register', userValidation.register, userController.register)
Router.post('/login', userValidation.login, userController.login)
Router.post('/logout', userController.logout)
Router.post('/refresh-token', userController.refreshToken)

// Google OAuth routes
Router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

Router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.CLIENT_URL}/auth/failure?error=oauth_failed`,
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
    failureRedirect: `${env.CLIENT_URL}/auth/failure?error=oauth_failed`,
    failureMessage: true
  }),
  userController.facebookOAuthSuccess
)

// Explicit Facebook failure route
Router.get('/auth/facebook/failure', userController.facebookOAuthFailure)

// Protected routes - cần xác thực
Router.use(authMiddleware.verifyToken)

// User routes - user có thể truy cập thông tin của chính mình
Router.get('/me', userController.getCurrentUser)
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

export const userRoute = Router
