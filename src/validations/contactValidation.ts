/**
 * Contact Validation
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { PHONE_RULE, PHONE_RULE_MESSAGE } from '~/utils/zodValidators.js'

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

/** Schema create contact */
const createContact = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = z.object({
    fullName: z.string().min(2, 'Họ tên quá ngắn').max(100, 'Họ tên quá dài'),
    email: z.string().email('Email không hợp lệ'),
    phoneNumber: z.string().regex(PHONE_RULE, PHONE_RULE_MESSAGE),
    message: z
      .string()
      .min(10, 'Nội dung quá ngắn')
      .max(1000, 'Nội dung quá dài')
  })

  try {
    await correctCondition.parseAsync(req.body)
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(
        new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, formatZodError(error))
      )
    } else {
      next(error)
    }
  }
}

export const contactValidation = {
  createContact
}
