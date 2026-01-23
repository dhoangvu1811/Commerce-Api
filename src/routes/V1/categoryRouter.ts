/**
 * Category Router
 * Định nghĩa routes cho category module
 */

import { Router } from 'express'
import express from 'express'
import { categoryController } from '~/controllers/categoryController.js'
import { categoryValidation } from '~/validations/categoryValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { PERMISSIONS } from '~/constants/rbac.js'

import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware.js'

const router: Router = express.Router()

// Public Routes
router.route('/').get(categoryController.getAll)
router
  .route('/:id')
  .get(categoryValidation.checkCategoryId, categoryController.getDetail)

// Protected Routes (Admin/Staff with manage_products permission)
router.use(
  authMiddleware.verifyToken,
  authMiddleware.requirePermission(PERMISSIONS.MANAGE_PRODUCTS)
)

// Bulk delete
router.delete(
  '/delete-many',
  categoryValidation.deleteMany,
  categoryController.deleteMany
)

router.post(
  '/',
  multerUploadMiddleware.upload.single('image'),
  categoryValidation.createNew,
  categoryController.createNew
)

router.put(
  '/:id',
  multerUploadMiddleware.upload.single('image'),
  categoryValidation.checkCategoryId,
  categoryValidation.update,
  categoryController.update
)

router.delete(
  '/:id',
  categoryValidation.checkCategoryId,
  categoryController.deleteCategory
)

export const categoryRouter: Router = router
