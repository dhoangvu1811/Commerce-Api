/**
 * Product Router
 * Định nghĩa các routes cho products
 */

import express, { Router } from 'express'
import { productController } from '~/controllers/productController.js'
import { productValidation } from '~/validations/productValidation.js'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const RouterInstance: Router = express.Router()

// Public routes - không cần xác thực (cho khách hàng xem sản phẩm)
RouterInstance.get('/details/:id', productController.getDetails)
RouterInstance.get('/getAll', productController.getProducts)
RouterInstance.get('/getAllType', productController.getAllTypes)

// Protected routes - yêu cầu xác thực và quyền admin
RouterInstance.use(authMiddleware.verifyToken, authMiddleware.verifyAdmin)

// Admin-only routes - quản lý sản phẩm
RouterInstance.post('/create', productValidation.createNew, productController.createNew)

RouterInstance.put('/update/:id', productValidation.update, productController.update)

RouterInstance.delete('/delete/:id', productValidation.deleteProduct, productController.deleteProduct)

RouterInstance.post('/deleteSelected', productValidation.deleteSelected, productController.deleteSelectedProducts)

// Upload ảnh sản phẩm lên Cloudinary
RouterInstance.post('/upload-image', multerUploadMiddleware.upload.single('image'), productController.uploadImage)

export const productRoute = RouterInstance
