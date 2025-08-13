import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { productRoute } from './productRouter'
import { userRoute } from './userRouter'
import { voucherRoute } from './voucherRouter'
import { orderRoute } from './orderRouter'

const Router = express.Router()

/* Check APIs V1/status */
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use.' })
})

/* Product APIs */
Router.use('/products', productRoute)

/* User APIs */
Router.use('/users', userRoute)

/* Voucher APIs */
Router.use('/vouchers', voucherRoute)

/* Order APIs */
Router.use('/orders', orderRoute)

export const APIs_V1 = Router
