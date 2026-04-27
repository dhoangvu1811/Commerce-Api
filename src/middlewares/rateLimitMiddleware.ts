/**
 * Rate Limit Middleware
 * Cấu hình giới hạn số lượng request để bảo vệ API khỏi abuse
 */

import rateLimit from 'express-rate-limit'
import type { RateLimitRequestHandler } from 'express-rate-limit'
import { StatusCodes } from 'http-status-codes'

/**
 * Rate limiter cho auth endpoints (login, register, verify)
 * Giới hạn: 5 requests / 15 phút
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Tối đa 5 requests
  message: {
    code: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 15 phút.',
    data: null
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false // Disable X-RateLimit-* headers
})

/**
 * Rate limiter cho password reset / verification email
 * Giới hạn: 3 requests / 1 giờ
 */
export const emailLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 50, // Tối đa 50 requests
  message: {
    code: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Quá nhiều yêu cầu gửi email. Vui lòng thử lại sau 1 giờ.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Rate limiter cho contact form
 * Giới hạn: 5 requests / 10 phút
 */
export const contactLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 50, // Tối đa 50 requests
  message: {
    code: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Bạn đã gửi liên hệ quá nhiều lần. Vui lòng thử lại sau 10 phút.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Rate limiter tổng quan cho toàn API
 * Giới hạn: 100 requests / phút
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 100, // Tối đa 100 requests
  message: {
    code: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Telemetry recommender (impression / click) — tránh spam batch
 */
/**
 * Chat AI / RAG — tránh spam
 */
export const aiChatLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    code: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Quá nhiều tin nhắn chat. Vui lòng thử lại sau.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
})

export const recommendationEventLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    code: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Quá nhiều sự kiện gợi ý. Vui lòng thử lại sau.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
})
