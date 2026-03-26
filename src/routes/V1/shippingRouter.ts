/**
 * Shipping Router
 * APIs cho location data và quote phí shipping.
 */

import type { Router } from 'express'
import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { shippingController } from '~/controllers/shippingController.js'
import { shippingValidation } from '~/validations/shippingValidation.js'

const router: Router = express.Router()

router.use(authMiddleware.verifyToken)

router.get('/locations/provinces', shippingController.getProvinces)
router.get('/locations/districts', shippingValidation.validateDistricts, shippingController.getDistricts)
router.get('/locations/wards', shippingValidation.validateWards, shippingController.getWards)
router.get('/services', shippingValidation.validateServices, shippingController.getServices)
router.post('/quote', shippingValidation.validateQuote, shippingController.quote)

export const shippingRouter = router
