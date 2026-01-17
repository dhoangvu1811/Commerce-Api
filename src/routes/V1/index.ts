/**
 * V1 API Routes Index
 * Aggregates all V1 routes
 */

import type { Request, Response, Router } from 'express'
import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { productRoute } from './productRouter.js'
import { userRoute } from './userRouter.js'
import { voucherRoute } from './voucherRouter.js'
import { orderRoute } from './orderRouter.js'
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

/* Product APIs */
RouterInstance.use('/products', productRoute)

/* User APIs */
RouterInstance.use('/users', userRoute)

/* Voucher APIs */
RouterInstance.use('/vouchers', voucherRoute)

/* Order APIs */
RouterInstance.use('/orders', orderRoute)

export const APIs_V1 = RouterInstance
