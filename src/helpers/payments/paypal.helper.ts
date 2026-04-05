import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { env } from '~/config/environment.js'
import type { PayPalErrorPayload } from '~/types/payment.types.js'

const ZERO_DECIMAL_CURRENCIES = new Set(['HUF', 'JPY', 'TWD', 'VND'])

export const resolvePayPalBaseUrl = (): string => {
  const paypalEnv = String(env.PAYPAL_ENV || 'sandbox').trim().toLowerCase()

  if (paypalEnv === 'live' || paypalEnv === 'production') {
    return 'https://api-m.paypal.com'
  }

  if (paypalEnv === 'sandbox') {
    return 'https://api-m.sandbox.paypal.com'
  }

  throw new ApiError(
    StatusCodes.INTERNAL_SERVER_ERROR,
    `Cấu hình PAYPAL_ENV không hợp lệ (${env.PAYPAL_ENV}). Chỉ hỗ trợ "sandbox" hoặc "live".`
  )
}

export const ensurePayPalConfig = (): void => {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Cấu hình PayPal chưa đầy đủ. Vui lòng kiểm tra PAYPAL_CLIENT_ID và PAYPAL_CLIENT_SECRET.'
    )
  }
}

export const parseJsonSafely = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const formatAmountByCurrency = (amount: number, currency: string): string => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return String(Math.round(amount))
  }

  return amount.toFixed(2)
}

export const resolvePayPalErrorStatus = (status: number): number => {
  if (status >= 500) return StatusCodes.BAD_GATEWAY
  if (status >= 400 && status < 500) return StatusCodes.BAD_REQUEST

  return StatusCodes.BAD_GATEWAY
}

export const buildPayPalErrorMessage = (
  status: number,
  payload: PayPalErrorPayload | null
): string => {
  if (status === StatusCodes.UNAUTHORIZED) {
    return 'PayPal từ chối xác thực (401). Hãy kiểm tra PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET đúng cặp của cùng ứng dụng và PAYPAL_ENV khớp với app (sandbox hoặc live).'
  }

  if (!payload) {
    return `PayPal API lỗi với status ${status}`
  }

  const issues = (payload.details || [])
    .map((item) => item.issue || '')
    .filter(Boolean)

  if (issues.includes('INSTRUMENT_DECLINED')) {
    return 'PayPal từ chối nguồn tiền thanh toán. Nếu đang dùng sandbox, hãy đổi tài khoản buyer/funding source. Đồng thời kiểm tra cấu hình quy đổi tiền tệ (ví dụ đơn VND nhưng PayPal đang chạy USD).'
  }

  const details = (payload.details || [])
    .map((item) => item.description || item.issue)
    .filter(Boolean)
    .join('; ')

  const baseMessage = payload.message || payload.name || `PayPal API lỗi với status ${status}`

  return details ? `${baseMessage} - ${details}` : baseMessage
}