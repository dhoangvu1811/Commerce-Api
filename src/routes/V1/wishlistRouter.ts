/**
 * Wishlist Routes
 */

import type { Router } from 'express'
import express from 'express'
import { wishlistController } from '~/controllers/wishlistController.js'
import { wishlistValidation } from '~/validations/wishlistValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const router: Router = express.Router()

router.use(authMiddleware.verifyToken)

router.get('/', wishlistController.getMyWishlist)

router.post('/toggle', wishlistValidation.toggleWishlist, wishlistController.toggleWishlist)

export const wishlistRouter = router
