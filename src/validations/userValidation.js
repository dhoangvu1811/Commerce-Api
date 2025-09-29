import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import {
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE,
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE
} from '~/utils/validators'

const register = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().required().trim().min(2).max(100).messages({
      'string.empty': 'Tên không được để trống',
      'string.min': 'Tên phải có ít nhất 2 ký tự',
      'string.max': 'Tên không được vượt quá 100 ký tự',
      'any.required': 'Tên là bắt buộc'
    }),
    email: Joi.string()
      .required()
      .pattern(EMAIL_RULE)
      .lowercase()
      .trim()
      .messages({
        'string.empty': 'Email không được để trống',
        'string.pattern.base': EMAIL_RULE_MESSAGE,
        'any.required': 'Email là bắt buộc'
      }),
    password: Joi.string().required().pattern(PASSWORD_RULE).messages({
      'string.empty': 'Mật khẩu không được để trống',
      'string.pattern.base': PASSWORD_RULE_MESSAGE,
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
    email: Joi.string()
      .required()
      .pattern(EMAIL_RULE)
      .lowercase()
      .trim()
      .messages({
        'string.empty': 'Email không được để trống',
        'string.pattern.base': EMAIL_RULE_MESSAGE,
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
    email: Joi.string()
      .optional()
      .pattern(EMAIL_RULE)
      .lowercase()
      .trim()
      .messages({
        'string.empty': 'Email không được để trống',
        'string.pattern.base': EMAIL_RULE_MESSAGE
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
    currentPassword: Joi.string().optional().messages({
      'string.empty': 'Mật khẩu hiện tại không được để trống',
      'any.required': 'Mật khẩu hiện tại là bắt buộc'
    }),
    newPassword: Joi.string().required().pattern(PASSWORD_RULE).messages({
      'string.empty': 'Mật khẩu mới không được để trống',
      'string.pattern.base': PASSWORD_RULE_MESSAGE,
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
    id: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.empty': 'ID người dùng không được để trống',
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
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
        Joi.string().pattern(OBJECT_ID_RULE).messages({
          'string.pattern.base': OBJECT_ID_RULE_MESSAGE
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
    email: Joi.string()
      .optional()
      .pattern(EMAIL_RULE)
      .lowercase()
      .trim()
      .messages({
        'string.empty': 'Email không được để trống',
        'string.pattern.base': EMAIL_RULE_MESSAGE
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
    email: Joi.string()
      .required()
      .pattern(EMAIL_RULE)
      .lowercase()
      .trim()
      .messages({
        'string.empty': 'Email không được để trống',
        'string.pattern.base': EMAIL_RULE_MESSAGE,
        'any.required': 'Email là bắt buộc'
      }),
    password: Joi.string().required().pattern(PASSWORD_RULE).messages({
      'string.empty': 'Mật khẩu không được để trống',
      'string.pattern.base': PASSWORD_RULE_MESSAGE,
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

const userActivation = async (req, res, next) => {
  const correctCondition = Joi.object({
    userId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.empty': 'User ID không được để trống',
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
      'any.required': 'User ID là bắt buộc'
    })
  })

  try {
    // Validate params
    await correctCondition.validateAsync(req.params, { abortEarly: false })
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

// Validation gửi email xác minh
const sendVerificationEmail = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string()
      .required()
      .pattern(EMAIL_RULE)
      .lowercase()
      .trim()
      .messages({
        'string.empty': 'Email không được để trống',
        'string.pattern.base': EMAIL_RULE_MESSAGE,
        'any.required': 'Email là bắt buộc'
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

// Validation xác minh tài khoản
const verifyUserAccount = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string()
      .required()
      .pattern(EMAIL_RULE)
      .lowercase()
      .trim()
      .messages({
        'string.empty': 'Email không được để trống',
        'string.pattern.base': EMAIL_RULE_MESSAGE,
        'any.required': 'Email là bắt buộc'
      }),
    token: Joi.string().required().messages({
      'string.empty': 'Token xác minh không được để trống',
      'any.required': 'Token xác minh là bắt buộc'
    })
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false })
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

// Validation for revoke session
const revokeSession = async (req, res, next) => {
  const correctCondition = Joi.object({
    sessionId: Joi.string().required().trim().messages({
      'string.empty': 'SessionId không được để trống',
      'any.required': 'SessionId là bắt buộc'
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

// Validation for revoke all sessions
const revokeAllSessions = async (req, res, next) => {
  const correctCondition = Joi.object({
    userId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.empty': 'UserId không được để trống',
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
      'any.required': 'UserId là bắt buộc'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
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

// Validation for get user sessions
const getUserSessions = async (req, res, next) => {
  const correctCondition = Joi.object({
    userId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'string.empty': 'UserId không được để trống',
      'string.pattern.base': OBJECT_ID_RULE_MESSAGE,
      'any.required': 'UserId là bắt buộc'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
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
  createUserByAdmin,
  userActivation,
  sendVerificationEmail,
  verifyUserAccount,
  revokeSession,
  revokeAllSessions,
  getUserSessions
}
