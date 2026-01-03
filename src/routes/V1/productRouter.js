import express from 'express'
import { productController } from '~/controllers/productController'
import { productValidation } from '~/validations/productValidation'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Public routes - không cần xác thực (cho khách hàng xem sản phẩm)
Router.get('/details/:id', productController.getDetails)
Router.get('/getAll', productController.getProducts)
Router.get('/getAllType', productController.getAllTypes)

// Protected routes - yêu cầu xác thực và quyền admin
Router.use(authMiddleware.verifyToken, authMiddleware.verifyAdmin)

// Admin-only routes - quản lý sản phẩm
Router.post('/create', productValidation.createNew, productController.createNew)

Router.put('/update/:id', productValidation.update, productController.update)

Router.delete(
  '/delete/:id',
  productValidation.deleteProduct,
  productController.deleteProduct
)

Router.post(
  '/deleteSelected',
  productValidation.deleteSelected,
  productController.deleteSelectedProducts
)

// Upload ảnh sản phẩm lên Cloudinary
Router.post(
  '/upload-image',
  multerUploadMiddleware.upload.single('image'),
  productController.uploadImage
)

export const productRoute = Router
