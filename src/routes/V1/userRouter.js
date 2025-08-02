import express from 'express'
import { userController } from '~/controllers/userController'
import { userValidation } from '~/validations/userValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

// Public routes - không cần xác thực
Router.post('/register', userValidation.register, userController.register)
Router.post('/login', userValidation.login, userController.login)
Router.post('/logout', userController.logout)
Router.post('/refresh-token', userController.refreshToken)

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

// Admin routes - chỉ admin mới có quyền
Router.get('/all', authMiddleware.verifyAdmin, userController.getUsers)

Router.get(
  '/details/:id',
  authMiddleware.verifyUserOwnership,
  userController.getDetails
)

Router.put(
  '/update/:id',
  authMiddleware.verifyAdmin,
  multerUploadMiddleware.upload.single('avatar'),
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
