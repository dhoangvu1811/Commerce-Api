/**
 * Order Validation
 * Xác thực dữ liệu đầu vào cho các API liên quan đến order
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { OBJECT_ID_RULE } from '~/utils/zodValidators.js'
import { orderModel } from '~/models/orderModel.js'
import { ALLOWED_PAYMENT_METHODS } from '~/utils/constants.js'

/** Schema cho order item */
const orderItemSchema = z.object({
  productId: z
    .string({ required_error: 'Vui lòng chọn sản phẩm' })
    .regex(OBJECT_ID_RULE, 'Sản phẩm không hợp lệ. Vui lòng thử lại.'),
  quantity: z
    .number({ required_error: 'Vui lòng nhập số lượng' })
    .int()
    .min(1, 'Số lượng phải ít nhất là 1')
    .max(1000, 'Số lượng tối đa là 1000 sản phẩm')
})

/** Schema cho shipping address */
const shippingAddressSchema = z.object({
  id: z.string().optional().default(''),
  name: z.string({ required_error: 'Tên người nhận là bắt buộc' }),
  phone: z.string({ required_error: 'Số điện thoại là bắt buộc' }),
  address: z.string({ required_error: 'Địa chỉ là bắt buộc' }),
  city: z.string({ required_error: 'Thành phố là bắt buộc' }),
  province: z.string({ required_error: 'Tỉnh/Thành là bắt buộc' }),
  postalCode: z.string().optional().default(''),
  isDefault: z.boolean().optional(),
  fullAddress: z.string().optional().default('')
})

/** Schema tạo order mới */
const createOrderSchema = z.object({
  items: z
    .array(orderItemSchema, { required_error: 'Giỏ hàng là bắt buộc' })
    .min(1, 'Giỏ hàng cần có ít nhất 1 sản phẩm')
    .max(100, 'Đơn hàng chỉ được tối đa 100 sản phẩm'),
  voucherCode: z.string().optional().default(''),
  shippingAddress: shippingAddressSchema,
  shippingFee: z
    .number()
    .min(0)
    .max(10000000, 'Phí vận chuyển không được vượt quá 10,000,000')
    .optional()
    .default(0),
  paymentMethod: z
    .enum(
      ALLOWED_PAYMENT_METHODS as unknown as readonly [string, ...string[]],
      {
        errorMap: () => ({
          message:
            'Phương thức thanh toán không hợp lệ. Vui lòng chọn: COD, Thẻ, Ví điện tử hoặc Chuyển khoản.'
        })
      }
    )
    .optional()
})

/** Schema validate order ID */
const orderIdSchema = z.object({
  id: z
    .string({ required_error: 'Vui lòng chọn đơn hàng' })
    .regex(OBJECT_ID_RULE, 'Đơn hàng không hợp lệ. Vui lòng thử lại.')
})

/** Schema update order status */
const updateStatusSchema = z.object({
  status: z.enum(
    orderModel.ORDER_STATUS as unknown as readonly [string, ...string[]],
    {
      required_error: 'Vui lòng chọn trạng thái đơn hàng'
    }
  )
})

/** Schema update payment status */
const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(
    orderModel.PAYMENT_STATUS as unknown as readonly [string, ...string[]],
    {
      required_error: 'Vui lòng chọn trạng thái thanh toán'
    }
  )
})

/**
 * Helper function để format Zod errors
 */
const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/**
 * Validation tạo order mới
 */
const create = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = createOrderSchema.safeParse(req.body)
  if (!result.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  }
  req.body = result.data
  next()
}

/**
 * Validation cập nhật trạng thái order
 */
const updateStatus = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const paramsResult = orderIdSchema.safeParse(req.params)
  if (!paramsResult.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(paramsResult.error)
      )
    )
  }

  const bodyResult = updateStatusSchema.safeParse(req.body)
  if (!bodyResult.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(bodyResult.error)
      )
    )
  }
  req.body = bodyResult.data
  next()
}

/**
 * Validation cập nhật trạng thái thanh toán
 */
const updatePaymentStatus = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const paramsResult = orderIdSchema.safeParse(req.params)
  if (!paramsResult.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(paramsResult.error)
      )
    )
  }

  const bodyResult = updatePaymentStatusSchema.safeParse(req.body)
  if (!bodyResult.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(bodyResult.error)
      )
    )
  }
  req.body = bodyResult.data
  next()
}

/**
 * Validation order ID trong params
 */
const validateOrderId = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = orderIdSchema.safeParse(req.params)
  if (!result.success) {
    return next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        formatZodError(result.error)
      )
    )
  }
  next()
}

export const orderValidation = {
  create,
  updateStatus,
  validateOrderId,
  updatePaymentStatus
}
