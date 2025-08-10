import express from 'express'
import { voucherController } from '~/controllers/voucherController'
import { voucherValidation } from '~/validations/voucherValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Public - verify voucher cho khách hàng (không bắt buộc đăng nhập)
Router.post(
  '/verify',
  voucherValidation.verify,
  voucherController.verifyVoucher
)

// Public - danh sách voucher đang hoạt động
Router.get('/active', voucherController.getActivePublic)

// Admin management
Router.use(authMiddleware.verifyToken)
Router.use(authMiddleware.verifyAdmin)

Router.get('/all', voucherController.getVouchers)
Router.get('/details/:id', voucherController.getDetails)
Router.post('/create', voucherValidation.createNew, voucherController.createNew)
Router.put('/update/:id', voucherValidation.update, voucherController.update)
Router.delete(
  '/delete/:id',
  voucherValidation.deleteVoucher,
  voucherController.deleteVoucher
)

Router.post(
  '/delete-multiple',
  voucherValidation.deleteMultiple,
  voucherController.deleteMultiple
)

export const voucherRoute = Router
