import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { orderModel } from '~/models/orderModel'
import { ALLOWED_PAYMENT_METHODS } from '~/utils/constants'

const create = async (req, res, next) => {
  const correctCondition = Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
            'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
            'any.required': 'productId là bắt buộc'
          }),
          quantity: Joi.number()
            .integer()
            .min(1)
            .max(1000)
            .required()
            .messages({
              'number.base': 'Số lượng phải là số nguyên',
              'number.min': 'Số lượng tối thiểu là 1',
              'number.max': 'Số lượng tối đa là 1000 cho mỗi sản phẩm',
              'any.required': 'Số lượng là bắt buộc'
            })
        })
      )
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'Cần ít nhất 1 sản phẩm',
        'array.max': 'Tối đa 100 sản phẩm trong 1 đơn hàng'
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
        'any.only': `Phương thức thanh toán phải là một trong: ${ALLOWED_PAYMENT_METHODS.filter(
          (m) => m
        ).join(', ')}`
      })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message)
    )
  }
}

const updateStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
      'any.required': 'ID đơn hàng là bắt buộc'
    })
  })

  const bodyCondition = Joi.object({
    status: Joi.string()
      .valid(...orderModel.ORDER_STATUS)
      .required()
      .messages({
        'any.required': 'Trạng thái đơn hàng là bắt buộc'
      })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    await bodyCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message)
    )
  }
}

const updatePaymentStatus = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
      'any.required': 'ID đơn hàng là bắt buộc'
    })
  })

  const bodyCondition = Joi.object({
    paymentStatus: Joi.string()
      .valid(...orderModel.PAYMENT_STATUS)
      .required()
      .messages({
        'any.required': 'Trạng thái thanh toán là bắt buộc'
      })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    await bodyCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message)
    )
  }
}

// Validation cho order ID trong params (dùng cho cancel, details, etc.)
const validateOrderId = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
      'any.required': 'ID đơn hàng là bắt buộc'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(
      new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message)
    )
  }
}

export const orderValidation = {
  create,
  updateStatus,
  validateOrderId,
  updatePaymentStatus
}
