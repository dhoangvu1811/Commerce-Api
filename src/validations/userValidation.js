import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const register = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().required().trim().min(2).max(100).messages({
      'string.empty': 'Tên không được để trống',
      'string.min': 'Tên phải có ít nhất 2 ký tự',
      'string.max': 'Tên không được vượt quá 100 ký tự',
      'any.required': 'Tên là bắt buộc'
    }),
    email: Joi.string().required().email().lowercase().trim().messages({
      'string.empty': 'Email không được để trống',
      'string.email': 'Email không đúng định dạng',
      'any.required': 'Email là bắt buộc'
    }),
    password: Joi.string().required().min(6).max(255).messages({
      'string.empty': 'Mật khẩu không được để trống',
      'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
      'string.max': 'Mật khẩu không được vượt quá 255 ký tự',
      'any.required': 'Mật khẩu là bắt buộc'
    }),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref('password'))
      .messages({
        'any.only': 'Xác nhận mật khẩu không khớp',
        'any.required': 'Xác nhận mật khẩu là bắt buộc'
      }),
    phone: Joi.string()
      .optional()
      .trim()
      .pattern(/^[0-9+\-\s()]+$/)
      .min(10)
      .max(15)
      .allow('')
      .messages({
        'string.pattern.base': 'Số điện thoại không đúng định dạng',
        'string.min': 'Số điện thoại phải có ít nhất 10 ký tự',
        'string.max': 'Số điện thoại không được vượt quá 15 ký tự'
      }),
    address: Joi.string().optional().trim().max(500).allow('').messages({
      'string.max': 'Địa chỉ không được vượt quá 500 ký tự'
    }),
    dateOfBirth: Joi.date().optional().max('now').allow(null).messages({
      'date.max': 'Ngày sinh không được lớn hơn ngày hiện tại'
    }),
    gender: Joi.string()
      .optional()
      .valid('male', 'female', 'other')
      .allow('')
      .messages({
        'any.only': 'Giới tính phải là male, female hoặc other'
      })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = new Error(error).message
    const customError = new ApiError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      errorMessage
    )
    next(customError)
  }
}

const login = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().required().email().lowercase().trim().messages({
      'string.empty': 'Email không được để trống',
      'string.email': 'Email không đúng định dạng',
      'any.required': 'Email là bắt buộc'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Mật khẩu không được để trống',
      'any.required': 'Mật khẩu là bắt buộc'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = new Error(error).message
    const customError = new ApiError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      errorMessage
    )
    next(customError)
  }
}

const updateUser = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().optional().trim().min(2).max(100).messages({
      'string.empty': 'Tên không được để trống',
      'string.min': 'Tên phải có ít nhất 2 ký tự',
      'string.max': 'Tên không được vượt quá 100 ký tự'
    }),
    email: Joi.string().optional().email().lowercase().trim().messages({
      'string.empty': 'Email không được để trống',
      'string.email': 'Email không đúng định dạng'
    }),
    phone: Joi.string()
      .optional()
      .trim()
      .pattern(/^[0-9+\-\s()]+$/)
      .min(10)
      .max(15)
      .allow('')
      .messages({
        'string.pattern.base': 'Số điện thoại không đúng định dạng',
        'string.min': 'Số điện thoại phải có ít nhất 10 ký tự',
        'string.max': 'Số điện thoại không được vượt quá 15 ký tự'
      }),
    address: Joi.string().optional().trim().max(500).allow('').messages({
      'string.max': 'Địa chỉ không được vượt quá 500 ký tự'
    }),
    avatar: Joi.string().optional().uri().allow('').messages({
      'string.uri': 'Avatar phải là URL hợp lệ'
    }),
    dateOfBirth: Joi.date().optional().max('now').allow(null).messages({
      'date.max': 'Ngày sinh không được lớn hơn ngày hiện tại'
    }),
    gender: Joi.string()
      .optional()
      .valid('male', 'female', 'other')
      .allow('')
      .messages({
        'any.only': 'Giới tính phải là male, female hoặc other'
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

const updatePassword = async (req, res, next) => {
  const correctCondition = Joi.object({
    currentPassword: Joi.string().required().messages({
      'string.empty': 'Mật khẩu hiện tại không được để trống',
      'any.required': 'Mật khẩu hiện tại là bắt buộc'
    }),
    newPassword: Joi.string().required().min(6).max(255).messages({
      'string.empty': 'Mật khẩu mới không được để trống',
      'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
      'string.max': 'Mật khẩu mới không được vượt quá 255 ký tự',
      'any.required': 'Mật khẩu mới là bắt buộc'
    }),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref('newPassword'))
      .messages({
        'any.only': 'Xác nhận mật khẩu không khớp',
        'any.required': 'Xác nhận mật khẩu là bắt buộc'
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

const deleteUser = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string()
      .required()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.empty': 'ID người dùng không được để trống',
        'string.pattern.base': 'ID người dùng không hợp lệ',
        'any.required': 'ID người dùng là bắt buộc'
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

const deleteMultipleUsers = async (req, res, next) => {
  const correctCondition = Joi.object({
    userIds: Joi.array()
      .items(
        Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .messages({
            'string.pattern.base': 'ID người dùng không hợp lệ'
          })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'Phải chọn ít nhất 1 người dùng để xóa',
        'any.required': 'Danh sách ID người dùng là bắt buộc'
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

const updateUserByAdmin = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().optional().trim().min(2).max(100).messages({
      'string.empty': 'Tên không được để trống',
      'string.min': 'Tên phải có ít nhất 2 ký tự',
      'string.max': 'Tên không được vượt quá 100 ký tự'
    }),
    email: Joi.string().optional().email().lowercase().trim().messages({
      'string.empty': 'Email không được để trống',
      'string.email': 'Email không đúng định dạng'
    }),
    phone: Joi.string()
      .optional()
      .trim()
      .pattern(/^[0-9+\-\s()]+$/)
      .min(10)
      .max(15)
      .allow('')
      .messages({
        'string.pattern.base': 'Số điện thoại không đúng định dạng',
        'string.min': 'Số điện thoại phải có ít nhất 10 ký tự',
        'string.max': 'Số điện thoại không được vượt quá 15 ký tự'
      }),
    address: Joi.string().optional().trim().max(500).allow('').messages({
      'string.max': 'Địa chỉ không được vượt quá 500 ký tự'
    }),
    avatar: Joi.string().optional().uri().allow('').messages({
      'string.uri': 'Avatar phải là URL hợp lệ'
    }),
    dateOfBirth: Joi.date().optional().max('now').allow(null).messages({
      'date.max': 'Ngày sinh không được lớn hơn ngày hiện tại'
    }),
    gender: Joi.string()
      .optional()
      .valid('male', 'female', 'other')
      .allow('')
      .messages({
        'any.only': 'Giới tính phải là male, female hoặc other'
      }),
    role: Joi.string().optional().valid('admin', 'user').messages({
      'any.only': 'Quyền phải là admin hoặc user'
    }),
    isActive: Joi.boolean().optional().messages({
      'boolean.base': 'Trạng thái hoạt động phải là true hoặc false'
    }),
    emailVerified: Joi.boolean().optional().messages({
      'boolean.base': 'Trạng thái xác thực email phải là true hoặc false'
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

const createUserByAdmin = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().required().trim().min(2).max(100).messages({
      'string.empty': 'Tên không được để trống',
      'string.min': 'Tên phải có ít nhất 2 ký tự',
      'string.max': 'Tên không được vượt quá 100 ký tự',
      'any.required': 'Tên là bắt buộc'
    }),
    avatar: Joi.string().optional().uri().allow('').messages({
      'string.uri': 'Avatar phải là URL hợp lệ'
    }),
    email: Joi.string().required().email().lowercase().trim().messages({
      'string.empty': 'Email không được để trống',
      'string.email': 'Email không đúng định dạng',
      'any.required': 'Email là bắt buộc'
    }),
    password: Joi.string().required().min(6).max(255).messages({
      'string.empty': 'Mật khẩu không được để trống',
      'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
      'string.max': 'Mật khẩu không được vượt quá 255 ký tự',
      'any.required': 'Mật khẩu là bắt buộc'
    }),
    phone: Joi.string()
      .optional()
      .trim()
      .pattern(/^[0-9+\-\s()]+$/)
      .min(10)
      .max(15)
      .allow('')
      .messages({
        'string.pattern.base': 'Số điện thoại không đúng định dạng',
        'string.min': 'Số điện thoại phải có ít nhất 10 ký tự',
        'string.max': 'Số điện thoại không được vượt quá 15 ký tự'
      }),
    address: Joi.string().optional().trim().max(500).allow('').messages({
      'string.max': 'Địa chỉ không được vượt quá 500 ký tự'
    }),
    dateOfBirth: Joi.date().optional().max('now').allow(null).messages({
      'date.max': 'Ngày sinh không được lớn hơn ngày hiện tại'
    }),
    gender: Joi.string()
      .optional()
      .valid('male', 'female', 'other')
      .allow('')
      .messages({
        'any.only': 'Giới tính phải là male, female hoặc other'
      }),
    role: Joi.string()
      .optional()
      .valid('admin', 'user')
      .default('user')
      .messages({
        'any.only': 'Quyền phải là admin hoặc user'
      }),
    isActive: Joi.boolean().optional().default(true).messages({
      'boolean.base': 'Trạng thái hoạt động phải là true hoặc false'
    }),
    emailVerified: Joi.boolean().optional().default(false).messages({
      'boolean.base': 'Trạng thái xác thực email phải là true hoặc false'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = new Error(error).message
    const customError = new ApiError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      errorMessage
    )
    next(customError)
  }
}

export const userValidation = {
  register,
  login,
  updateUser,
  updatePassword,
  deleteUser,
  deleteMultipleUsers,
  updateUserByAdmin,
  createUserByAdmin
}
