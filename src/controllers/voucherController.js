import { StatusCodes } from 'http-status-codes'
import { voucherService } from '~/services/voucherService'

const createNew = async (req, res, next) => {
  try {
    const created = await voucherService.createNew(req.body)
    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo voucher thành công',
      data: created
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const id = req.params?.id
    const voucher = await voucherService.getDetails(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết voucher thành công',
      data: voucher
    })
  } catch (error) {
    next(error)
  }
}

const update = async (req, res, next) => {
  try {
    const id = req.params?.id
    const updated = await voucherService.update(id, req.body)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật voucher thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const deleteVoucher = async (req, res, next) => {
  try {
    const id = req.params?.id
    const result = await voucherService.deleteVoucher(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa voucher thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getVouchers = async (req, res, next) => {
  try {
    const { page, itemsPerPage, search, type, isActive, sort } = req.query || {}
    const query = { search, type, isActive, sort }
    const result = await voucherService.getVouchers(page, itemsPerPage, query)

    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách voucher thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const verifyVoucher = async (req, res, next) => {
  try {
    const { code, orderTotal } = req.body || {}
    const result = await voucherService.verifyVoucher(code, orderTotal)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Áp dụng voucher thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const deleteMultiple = async (req, res, next) => {
  try {
    const { voucherIds } = req.body || {}
    const result = await voucherService.deleteMultiple(voucherIds)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xóa các voucher được chọn thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const voucherController = {
  createNew,
  getDetails,
  update,
  deleteVoucher,
  deleteMultiple,
  getVouchers,
  verifyVoucher
}
