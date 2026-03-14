/**
 * Contact Validation
 */

import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { PHONE_RULE, PHONE_RULE_MESSAGE } from '~/utils/zodValidators.js'

const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gmmail.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmai.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'hotnail.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outllok.com': 'outlook.com',
  'outlok.com': 'outlook.com'
}

const getSuggestedEmail = (email: string): string | null => {
  const normalizedEmail = email.trim().toLowerCase()
  const [localPart, domain] = normalizedEmail.split('@')

  if (!localPart || !domain) {
    return null
  }

  const suggestedDomain = COMMON_EMAIL_DOMAIN_TYPOS[domain]
  if (!suggestedDomain) {
    return null
  }

  return `${localPart}@${suggestedDomain}`
}

const formatZodError = (error: z.ZodError): string => {
  return error.errors.map((e) => e.message).join(', ')
}

const extractPlainTextFromHtml = (value: string): string => {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Schema create contact */
const createContact = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const correctCondition = z
    .object({
      fullName: z
        .string()
        .trim()
        .min(2, 'Họ tên quá ngắn')
        .max(100, 'Họ tên quá dài'),
      email: z.string().trim().email('Email không hợp lệ'),
      phoneNumber: z
        .string()
        .trim()
        .regex(PHONE_RULE, PHONE_RULE_MESSAGE)
        .min(10, 'Số điện thoại phải có ít nhất 10 ký tự')
        .max(15, 'Số điện thoại không được quá 15 ký tự'),
      message: z
        .string()
        .trim()
        .min(10, 'Nội dung quá ngắn')
        .max(1000, 'Nội dung quá dài')
    })
    .superRefine((data, context) => {
      const suggestedEmail = getSuggestedEmail(data.email)

      if (suggestedEmail) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: `Email có thể bị sai domain. Bạn có muốn dùng "${suggestedEmail}" không?`
        })
      }
    })

  try {
    req.body = await correctCondition.parseAsync(req.body)
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
  createContact,
  replyContact: async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const replyCondition = z.object({
      subject: z.preprocess(
        (value) => {
          if (typeof value !== 'string') {
            return value
          }

          const trimmedValue = value.trim()

          return trimmedValue === '' ? undefined : trimmedValue
        },
        z
          .string()
          .min(3, 'Tiêu đề phản hồi quá ngắn')
          .max(150, 'Tiêu đề phản hồi quá dài')
          .optional()
      ),
      message: z
        .string()
        .trim()
        .min(1, 'Nội dung phản hồi quá ngắn')
        .max(20000, 'Nội dung phản hồi quá dài')
        .superRefine((value, context) => {
          const plainText = extractPlainTextFromHtml(value)

          if (plainText.length < 10) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Nội dung phản hồi quá ngắn'
            })
          }

          if (plainText.length > 2000) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Nội dung phản hồi quá dài'
            })
          }
        })
    })

    try {
      req.body = await replyCondition.parseAsync(req.body)
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
}
