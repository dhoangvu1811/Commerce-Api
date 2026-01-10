/**
 * Product Validation
 * Xác thực dữ liệu đầu vào cho các API liên quan đến product
 */

import type { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'

/**
 * Validation tạo product mới
 */
const createNew = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const correctCondition = Joi.object({
    name: Joi.string().required().trim().min(2).max(255).messages({
      'string.empty': 'Tên sản phẩm không được để trống',
      'string.min': 'Tên sản phẩm phải có ít nhất 2 ký tự',
      'string.max': 'Tên sản phẩm không được vượt quá 255 ký tự',
      'any.required': 'Tên sản phẩm là bắt buộc'
    }),
    image: Joi.string().required().uri().messages({
      'string.empty': 'Hình ảnh sản phẩm không được để trống',
      'string.uri': 'Hình ảnh phải là URL hợp lệ',
      'any.required': 'Hình ảnh sản phẩm là bắt buộc'
    }),
    type: Joi.string().required().trim().min(2).max(100).messages({
      'string.empty': 'Loại sản phẩm không được để trống',
      'string.min': 'Loại sản phẩm phải có ít nhất 2 ký tự',
      'string.max': 'Loại sản phẩm không được vượt quá 100 ký tự',
      'any.required': 'Loại sản phẩm là bắt buộc'
    }),
    countInStock: Joi.number().required().integer().min(0).messages({
      'number.base': 'Số lượng tồn kho phải là số',
      'number.integer': 'Số lượng tồn kho phải là số nguyên',
      'number.min': 'Số lượng tồn kho không được âm',
      'any.required': 'Số lượng tồn kho là bắt buộc'
    }),
    price: Joi.number().required().positive().precision(2).messages({
      'number.base': 'Giá sản phẩm phải là số',
      'number.positive': 'Giá sản phẩm phải lớn hơn 0',
      'any.required': 'Giá sản phẩm là bắt buộc'
    }),
    rating: Joi.number().optional().min(0).max(5).precision(1).default(0).messages({
      'number.base': 'Đánh giá phải là số',
      'number.min': 'Đánh giá phải từ 0 đến 5',
      'number.max': 'Đánh giá phải từ 0 đến 5'
    }),
    description: Joi.string().optional().trim().max(1000).allow('').messages({
      'string.max': 'Mô tả không được vượt quá 1000 ký tự'
    }),
    selled: Joi.number().optional().integer().min(0).default(0).messages({
      'number.base': 'Số lượng đã bán phải là số',
      'number.integer': 'Số lượng đã bán phải là số nguyên',
      'number.min': 'Số lượng đã bán không được âm'
    }),
    discount: Joi.number().optional().min(0).max(100).precision(2).default(0).messages({
      'number.base': 'Giảm giá phải là số',
      'number.min': 'Giảm giá không được âm',
      'number.max': 'Giảm giá không được vượt quá 100%'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = new Error(String(error)).message
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

/**
 * Validation cập nhật product
 */
const update = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const correctCondition = Joi.object({
    name: Joi.string().optional().trim().min(2).max(255).messages({
      'string.empty': 'Tên sản phẩm không được để trống',
      'string.min': 'Tên sản phẩm phải có ít nhất 2 ký tự',
      'string.max': 'Tên sản phẩm không được vượt quá 255 ký tự'
    }),
    image: Joi.string().optional().uri().messages({
      'string.empty': 'Hình ảnh sản phẩm không được để trống',
      'string.uri': 'Hình ảnh phải là URL hợp lệ'
    }),
    type: Joi.string().optional().trim().min(2).max(100).messages({
      'string.empty': 'Loại sản phẩm không được để trống',
      'string.min': 'Loại sản phẩm phải có ít nhất 2 ký tự',
      'string.max': 'Loại sản phẩm không được vượt quá 100 ký tự'
    }),
    countInStock: Joi.number().optional().integer().min(0).messages({
      'number.base': 'Số lượng tồn kho phải là số',
      'number.integer': 'Số lượng tồn kho phải là số nguyên',
      'number.min': 'Số lượng tồn kho không được âm'
    }),
    price: Joi.number().optional().positive().precision(2).messages({
      'number.base': 'Giá sản phẩm phải là số',
      'number.positive': 'Giá sản phẩm phải lớn hơn 0'
    }),
    rating: Joi.number().optional().min(0).max(5).precision(1).messages({
      'number.base': 'Đánh giá phải là số',
      'number.min': 'Đánh giá phải từ 0 đến 5',
      'number.max': 'Đánh giá phải từ 0 đến 5'
    }),
    description: Joi.string().optional().trim().max(1000).allow('').messages({
      'string.max': 'Mô tả không được vượt quá 1000 ký tự'
    }),
    selled: Joi.number().optional().integer().min(0).messages({
      'number.base': 'Số lượng đã bán phải là số',
      'number.integer': 'Số lượng đã bán phải là số nguyên',
      'number.min': 'Số lượng đã bán không được âm'
    }),
    discount: Joi.number().optional().min(0).max(100).precision(2).messages({
      'number.base': 'Giảm giá phải là số',
      'number.min': 'Giảm giá không được âm',
      'number.max': 'Giảm giá không được vượt quá 100%'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(String(error)).message))
  }
}

/**
 * Validation xóa product
 */
const deleteProduct = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const correctCondition = Joi.object({
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.empty': 'ID sản phẩm không được để trống',
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
      'any.required': 'ID sản phẩm là bắt buộc'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(String(error)).message))
  }
}

/**
 * Validation xóa nhiều products
 */
const deleteSelected = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const correctCondition = Joi.object({
    productIds: Joi.array()
      .required()
      .min(1)
      .items(
        Joi.string().pattern(OBJECT_ID_RULE).messages({
          'string.pattern.base': OBJECT_ID_RULE_MESSAGE
        })
      )
      .messages({
        'array.base': 'Danh sách ID phải là một mảng',
        'array.min': 'Phải chọn ít nhất một sản phẩm để xóa',
        'any.required': 'Danh sách ID sản phẩm là bắt buộc'
      })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(String(error)).message))
  }
}

export const productValidation = {
  createNew,
  update,
  deleteProduct,
  deleteSelected
}
