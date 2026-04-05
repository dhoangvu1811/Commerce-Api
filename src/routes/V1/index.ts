/**
 * V1 API Routes Index
 * Aggregates all V1 routes
 */

import type { Request, Response, Router } from 'express'
import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { categoryRouter } from './categoryRouter.js'
import { productRoute } from './productRouter.js'
import { userRoute } from './userRouter.js'
import { voucherRoute } from './voucherRouter.js'
import { orderRoute } from './orderRouter.js'
import { shippingAddressRouter } from './shippingAddressRouter.js'
import { cartRouter } from './cartRouter.js'
import { wishlistRouter } from './wishlistRouter.js'
import { reviewRouter } from './reviewRouter.js'
import { contactRouter } from './contactRouter.js'
import { notificationRouter } from './notificationRouter.js'
import { roleRoute } from './roleRouter.js'
import { permissionRoute } from './permissionRouter.js'
import { shippingRouter } from './shippingRouter.js'
import { paymentRouter } from './paymentRouter.js'
import { prisma } from '~/config/prisma.js'

const RouterInstance: Router = express.Router()

/* Check APIs V1/status */
RouterInstance.get('/status', (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use.' })
})

/* Health check endpoint với database ping */
RouterInstance.get('/health', async (_req: Request, res: Response) => {
  try {
    // Kiểm tra kết nối PostgreSQL bằng query đơn giản
    await prisma.$queryRaw`SELECT 1`
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch {
    res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      code: StatusCodes.SERVICE_UNAVAILABLE,
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    })
  }
})

/* Category APIs */
RouterInstance.use('/categories', categoryRouter)

/* Product APIs */
RouterInstance.use('/products', productRoute)

/* User APIs */
RouterInstance.use('/users', userRoute)

/* Voucher APIs */
RouterInstance.use('/vouchers', voucherRoute)

/* Order APIs */
RouterInstance.use('/orders', orderRoute)

/* Shipping Address APIs */
RouterInstance.use('/shipping-addresses', shippingAddressRouter)

/* Shipping APIs */
RouterInstance.use('/shipping', shippingRouter)

/* Cart APIs */
RouterInstance.use('/cart', cartRouter)

/* Wishlist APIs */
RouterInstance.use('/wishlist', wishlistRouter)

/* Reviews APIs */
RouterInstance.use('/reviews', reviewRouter)

/* Contact APIs */
RouterInstance.use('/contacts', contactRouter)

/* Notification APIs */
RouterInstance.use('/notifications', notificationRouter)

/* Payment APIs */
RouterInstance.use('/payments', paymentRouter)

/* Role APIs (Admin Only) */
RouterInstance.use('/roles', roleRoute)

/* Permission APIs (Admin Only) */
RouterInstance.use('/permissions', permissionRoute)

export const APIs_V1 = RouterInstance
