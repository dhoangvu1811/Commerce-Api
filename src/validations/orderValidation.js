import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { orderModel } from '~/models/orderModel'

const create = async (req, res, next) => {
  const correctCondition = Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
            'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
            'any.required': 'productId là bắt buộc'
          }),
          quantity: Joi.number().integer().min(1).required().messages({
            'number.base': 'Số lượng phải là số nguyên',
            'number.min': 'Số lượng tối thiểu là 1',
            'any.required': 'Số lượng là bắt buộc'
          })
        })
      )
      .min(1)
      .required()
      .messages({ 'array.min': 'Cần ít nhất 1 sản phẩm' }),
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
    shippingFee: Joi.number().optional().min(0).precision(2).default(0),
    paymentMethod: Joi.string().optional().allow('')
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
      .optional(),
    paymentStatus: Joi.string()
      .valid(...orderModel.PAYMENT_STATUS)
      .optional()
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

const validateOrderCode = async (req, res, next) => {
  const correctCondition = Joi.object({
    orderCode: Joi.string().required().min(1).messages({
      'string.empty': 'Mã đơn hàng không được để trống',
      'any.required': 'Mã đơn hàng là bắt buộc'
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
  validateOrderCode
}
