/**
 * Shipping Address Routes
 * Định nghĩa routes cho địa chỉ giao hàng
 */

import type { Router } from 'express'
import express from 'express'
import { shippingAddressController } from '~/controllers/shippingAddressController.js'
import { shippingAddressValidation } from '~/validations/shippingAddressValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const router: Router = express.Router()

// Tất cả routes đều cần đăng nhập
router.use(authMiddleware.verifyToken)

router
  .route('/')
  .get(shippingAddressController.getMyAddresses)
  .post(
    shippingAddressValidation.createNew,
    shippingAddressController.createNew
  )

router
  .route('/:id')
  .get(shippingAddressController.getAddressDetail)
  .put(
    shippingAddressValidation.update,
    shippingAddressController.updateAddress
  )
  .delete(shippingAddressController.deleteAddress)

// Route set default riêng
router.route('/:id/default').patch(shippingAddressController.setDefaultAddress)

export const shippingAddressRouter = router
