import { StatusCodes } from 'http-status-codes'
import { orderService } from '~/services/orderService'

const create = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded?._id
    const created = await orderService.create(userId, req.body)
    res.status(StatusCodes.CREATED).json({
      code: StatusCodes.CREATED,
      message: 'Tạo đơn hàng thành công',
      data: created
    })
  } catch (error) {
    next(error)
  }
}

const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded?._id
    const { page, itemsPerPage } = req.query || {}
    const result = await orderService.getMyOrders(userId, page, itemsPerPage)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách đơn hàng của tôi thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getDetails = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded?._id
    const id = req.params?.id
    const order = await orderService.getDetails(id, userId, false)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order
    })
  } catch (error) {
    next(error)
  }
}

// Admin
const adminGetOrders = async (req, res, next) => {
  try {
    const { page, itemsPerPage, status, paymentStatus, search } =
      req.query || {}
    const result = await orderService.adminGetOrders(page, itemsPerPage, {
      status,
      paymentStatus,
      search
    })
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy danh sách đơn hàng thành công',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const adminGetDetails = async (req, res, next) => {
  try {
    const id = req.params?.id
    const order = await orderService.getDetails(id, null, true)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order
    })
  } catch (error) {
    next(error)
  }
}

const adminUpdateStatus = async (req, res, next) => {
  try {
    const id = req.params?.id
    const updated = await orderService.updateStatus(id, req.body)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Cập nhật đơn hàng thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const adminMarkPaid = async (req, res, next) => {
  try {
    const id = req.params?.id
    const updated = await orderService.markPaid(id)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Xác nhận thanh toán thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const userCancel = async (req, res, next) => {
  try {
    const id = req.params?.id
    const userId = req.jwtDecoded?._id
    const updated = await orderService.cancel(id, userId, false)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Hủy đơn hàng thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

const adminCancel = async (req, res, next) => {
  try {
    const id = req.params?.id
    const updated = await orderService.cancel(id, null, true)
    res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      message: 'Hủy đơn hàng (admin) thành công',
      data: updated
    })
  } catch (error) {
    next(error)
  }
}

export const orderController = {
  create,
  getMyOrders,
  getDetails,
  adminGetOrders,
  adminGetDetails,
  adminUpdateStatus,
  adminMarkPaid,
  userCancel,
  adminCancel
}
