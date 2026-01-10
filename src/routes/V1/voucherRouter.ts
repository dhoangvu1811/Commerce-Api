/**
 * Voucher Router
 * Định nghĩa các routes cho vouchers
 */

import express, { Router } from 'express'
import { voucherController } from '~/controllers/voucherController.js'
import { voucherValidation } from '~/validations/voucherValidation.js'
import { authMiddleware } from '~/middlewares/authMiddleware.js'

const RouterInstance: Router = express.Router()

// Public - verify voucher cho khách hàng (không bắt buộc đăng nhập)
RouterInstance.post('/verify', voucherValidation.verify, voucherController.verifyVoucher)

// Public - danh sách voucher đang hoạt động
RouterInstance.get('/active', voucherController.getActivePublic)

// Admin management - yêu cầu xác thực và quyền admin
RouterInstance.use(authMiddleware.verifyToken, authMiddleware.verifyAdmin)

RouterInstance.get('/all', voucherController.getVouchers)
RouterInstance.get('/details/:id', voucherController.getDetails)
RouterInstance.post('/create', voucherValidation.createNew, voucherController.createNew)
RouterInstance.put('/update/:id', voucherValidation.update, voucherController.update)
RouterInstance.delete('/delete/:id', voucherValidation.deleteVoucher, voucherController.deleteVoucher)

RouterInstance.post('/delete-multiple', voucherValidation.deleteMultiple, voucherController.deleteMultiple)

export const voucherRoute = RouterInstance
