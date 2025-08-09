import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    code: Joi.string()
      .required()
      .trim()
      .min(3)
      .max(50)
      .pattern(/^[A-Z0-9-_]+$/)
      .messages({
        'string.empty': 'Mã voucher không được để trống',
        'string.min': 'Mã voucher phải có ít nhất 3 ký tự',
        'string.max': 'Mã voucher không được vượt quá 50 ký tự',
        'string.pattern.base':
          'Mã voucher chỉ gồm A-Z, 0-9, gạch ngang hoặc gạch dưới',
        'any.required': 'Mã voucher là bắt buộc'
      }),
    type: Joi.string().required().valid('percent', 'fixed').messages({
      'any.only': 'Loại voucher phải là percent hoặc fixed',
      'any.required': 'Loại voucher là bắt buộc'
    }),
    amount: Joi.number().required().positive().precision(2).messages({
      'number.base': 'Giá trị giảm phải là số',
      'number.positive': 'Giá trị giảm phải lớn hơn 0',
      'any.required': 'Giá trị giảm là bắt buộc'
    }),
    maxDiscount: Joi.number().optional().min(0).precision(2).messages({
      'number.base': 'Giảm tối đa phải là số',
      'number.min': 'Giảm tối đa không được âm'
    }),
    minOrderValue: Joi.number().optional().min(0).precision(2).messages({
      'number.base': 'Giá trị đơn tối thiểu phải là số',
      'number.min': 'Giá trị đơn tối thiểu không được âm'
    }),
    usageLimit: Joi.number().optional().integer().min(0).messages({
      'number.base': 'Giới hạn sử dụng phải là số nguyên',
      'number.min': 'Giới hạn sử dụng không được âm'
    }),
    startDate: Joi.date().optional().allow(null),
    endDate: Joi.date().optional().allow(null),
    isActive: Joi.boolean().optional()
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

const update = async (req, res, next) => {
  const correctCondition = Joi.object({
    code: Joi.string()
      .optional()
      .trim()
      .min(3)
      .max(50)
      .pattern(/^[A-Z0-9-_]+$/)
      .messages({
        'string.pattern.base':
          'Mã voucher chỉ gồm A-Z, 0-9, gạch ngang hoặc gạch dưới'
      }),
    type: Joi.string().optional().valid('percent', 'fixed').messages({
      'any.only': 'Loại voucher phải là percent hoặc fixed'
    }),
    amount: Joi.number().optional().positive().precision(2).messages({
      'number.base': 'Giá trị giảm phải là số',
      'number.positive': 'Giá trị giảm phải lớn hơn 0'
    }),
    maxDiscount: Joi.number().optional().min(0).precision(2),
    minOrderValue: Joi.number().optional().min(0).precision(2),
    usageLimit: Joi.number().optional().integer().min(0),
    startDate: Joi.date().optional().allow(null),
    endDate: Joi.date().optional().allow(null),
    isActive: Joi.boolean().optional()
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

const deleteVoucher = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.empty': 'ID voucher không được để trống',
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
      'any.required': 'ID voucher là bắt buộc'
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

const verify = async (req, res, next) => {
  const correctCondition = Joi.object({
    code: Joi.string().required().trim().messages({
      'string.empty': 'Mã voucher không được để trống',
      'any.required': 'Mã voucher là bắt buộc'
    }),
    orderTotal: Joi.number().required().min(0).precision(2).messages({
      'number.base': 'Tổng đơn phải là số',
      'number.min': 'Tổng đơn không được âm',
      'any.required': 'Tổng đơn là bắt buộc'
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

const deleteMultiple = async (req, res, next) => {
  const correctCondition = Joi.object({
    voucherIds: Joi.array()
      .items(
        Joi.string().pattern(OBJECT_ID_RULE).messages({
          'string.pattern.base': OBJECT_ID_RULE_MESSAGE
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'Phải chọn ít nhất 1 voucher để xóa',
        'any.required': 'Danh sách ID voucher là bắt buộc'
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

export const voucherValidation = {
  createNew,
  update,
  deleteVoucher,
  verify,
  deleteMultiple
}
