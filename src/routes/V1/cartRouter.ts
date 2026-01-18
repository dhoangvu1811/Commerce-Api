/**
 * Cart Routes
 */

import type { Router } from 'express'
import express from 'express'
import { cartController } from '~/controllers/cartController.js'
import { cartValidation } from '~/validations/cartValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const router: Router = express.Router()

router.use(authMiddleware.verifyToken)

router.get('/', cartController.getMyCart)

router.post('/add', cartValidation.addToCart, cartController.addToCart)

router.put('/update', cartValidation.updateCart, cartController.updateCart)

router.delete('/remove/:productId', cartController.removeCartItem)

export const cartRouter = router
