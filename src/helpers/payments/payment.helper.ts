import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { env } from '~/config/environment.js'

const ZERO_DECIMAL_CURRENCIES = new Set(['HUF', 'JPY', 'TWD', 'VND'])

export const parseUserId = (userId: string): number => {
  const parsed = Number.parseInt(userId, 10)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID không hợp lệ')
  }

  return parsed
}

export const resolvePayPalCurrency = (): string => {
  const currency = env.PAYPAL_CURRENCY?.trim().toUpperCase() || 'USD'

  return currency
}

export const resolvePayPalSourceCurrency = (): string => {
  const currency = env.PAYPAL_SOURCE_CURRENCY?.trim().toUpperCase() || 'VND'

  return currency
}

export const roundAmountByCurrency = (amount: number, currency: string): number => {
  if (!Number.isFinite(amount)) return Number.NaN

  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(amount)
  }

  return Number(amount.toFixed(2))
}

export const isAmountTooSmallForCurrency = (amount: number, currency: string): boolean => {
  if (!Number.isFinite(amount) || amount <= 0) return true

  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return amount < 1
  }

  return amount < 0.01
}

export const convertOrderAmountToPayPalCurrency = (
  orderAmount: number,
  sourceCurrency: string,
  targetCurrency: string
): number => {
  if (sourceCurrency === targetCurrency) {
    return roundAmountByCurrency(orderAmount, targetCurrency)
  }

  if (sourceCurrency === 'VND' && targetCurrency === 'USD') {
    const rate = env.PAYPAL_VND_TO_USD_RATE

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Cấu hình PAYPAL_VND_TO_USD_RATE không hợp lệ'
      )
    }

    return roundAmountByCurrency(orderAmount / rate, targetCurrency)
  }

  if (sourceCurrency === 'USD' && targetCurrency === 'VND') {
    const rate = env.PAYPAL_VND_TO_USD_RATE

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Cấu hình PAYPAL_VND_TO_USD_RATE không hợp lệ'
      )
    }

    return roundAmountByCurrency(orderAmount * rate, targetCurrency)
  }

  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    `Chưa hỗ trợ quy đổi tiền tệ từ ${sourceCurrency} sang ${targetCurrency}`
  )
}