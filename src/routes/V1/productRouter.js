import express from 'express'
import { productController } from '~/controllers/productController'
import { productValidation } from '~/validations/productValidation'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

Router.post('/create', productValidation.createNew, productController.createNew)

Router.put('/update/:id', productValidation.update, productController.update)

Router.get('/details/:id', productController.getDetails)

Router.delete(
  '/delete/:id',
  productValidation.deleteProduct,
  productController.deleteProduct
)

Router.post('/deleteSelected', productController.deleteSelectedProducts)

Router.get('/getAll', productController.getProducts)

// Upload ảnh sản phẩm lên Cloudinary
Router.post(
  '/upload-image',
  multerUploadMiddleware.upload.single('image'),
  productController.uploadImage
)

// Router.post('/deleteMany', authMiddleware, productController.deleteManyProduct)

Router.get('/getAllType', productController.getAllTypes)

export const productRoute = Router
