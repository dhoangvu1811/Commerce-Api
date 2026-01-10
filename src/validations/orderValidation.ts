/**
 * Order Validation
 * Xác thực dữ liệu đầu vào cho các API liên quan đến order
 */

import type { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { OBJECT_ID_RULE } from '~/utils/validators.js'
import { orderModel } from '~/models/orderModel.js'
import { ALLOWED_PAYMENT_METHODS } from '~/utils/constants.js'

/**
 * Validation tạo order mới
 */
const create = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
            'string.pattern.base': 'Sản phẩm không hợp lệ. Vui lòng thử lại.',
            'any.required': 'Vui lòng chọn sản phẩm'
          }),
          quantity: Joi.number()
            .integer()
            .min(1)
            .max(1000)
            .required()
            .messages({
              'number.base': 'Số lượng phải là số',
              'number.min': 'Số lượng phải ít nhất là 1',
              'number.max': 'Số lượng tối đa là 1000 sản phẩm',
              'any.required': 'Vui lòng nhập số lượng'
            })
        })
      )
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'Giỏ hàng cần có ít nhất 1 sản phẩm',
        'array.max': 'Đơn hàng chỉ được tối đa 100 sản phẩm'
      }),
    voucherCode: Joi.string().optional().trim().allow(''),
    shippingAddress: Joi.object({
      id: Joi.string().optional().allow(''),
      name: Joi.string().required(),
      phone: Joi.string().required(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      province: Joi.string().required(),
      postalCode: Joi.string().optional().allow(''),
      isDefault: Joi.boolean().optional(),
      fullAddress: Joi.string().optional().allow('')
    }).required(),
    shippingFee: Joi.number()
      .optional()
      .min(0)
      .max(10000000)
      .precision(2)
      .default(0)
      .messages({
        'number.max': 'Phí vận chuyển không được vượt quá 10,000,000'
      }),
    paymentMethod: Joi.string()
      .optional()
      .valid(...ALLOWED_PAYMENT_METHODS)
      .messages({
        'any.only':
          'Phương thức thanh toán không hợp lệ. Vui lòng chọn: COD, Thẻ, Ví điện tử hoặc Chuyển khoản.'
      })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        new Error(String(error)).message
      )
    )
  }
}

/**
 * Validation cập nhật trạng thái order
 */
const updateStatus = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.pattern.base': 'Đơn hàng không hợp lệ. Vui lòng thử lại.',
      'any.required': 'Vui lòng chọn đơn hàng cần cập nhật'
    })
  })

  const bodyCondition = Joi.object({
    status: Joi.string()
      .valid(...orderModel.ORDER_STATUS)
      .required()
      .messages({
        'any.required': 'Vui lòng chọn trạng thái đơn hàng'
      })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    await bodyCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        new Error(String(error)).message
      )
    )
  }
}

/**
 * Validation cập nhật trạng thái thanh toán
 */
const updatePaymentStatus = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.pattern.base': 'Đơn hàng không hợp lệ. Vui lòng thử lại.',
      'any.required': 'Vui lòng chọn đơn hàng cần cập nhật'
    })
  })

  const bodyCondition = Joi.object({
    paymentStatus: Joi.string()
      .valid(...orderModel.PAYMENT_STATUS)
      .required()
      .messages({
        'any.required': 'Vui lòng chọn trạng thái thanh toán'
      })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    await bodyCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        new Error(String(error)).message
      )
    )
  }
}

/**
 * Validation order ID trong params
 */
const validateOrderId = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.pattern.base': 'Đơn hàng không hợp lệ. Vui lòng thử lại.',
      'any.required': 'Vui lòng chọn đơn hàng'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        new Error(String(error)).message
      )
    )
  }
}

export const orderValidation = {
  create,
  updateStatus,
  validateOrderId,
  updatePaymentStatus
}
