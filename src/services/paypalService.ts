/**
 * PayPal Service
 * Gọi REST API của PayPal để tạo và capture order.
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { env } from '~/config/environment.js'
import type {
  PayPalAccessTokenResponse,
  PayPalCaptureApiResponse,
  PayPalCaptureOrderResponse,
  PayPalCreateOrderInput,
  PayPalCreateOrderResponse,
  PayPalErrorPayload
} from '~/types/payment.types.js'
import {
  buildPayPalErrorMessage,
  ensurePayPalConfig,
  formatAmountByCurrency,
  parseJsonSafely,
  resolvePayPalBaseUrl,
  resolvePayPalErrorStatus
} from '~/helpers/payments/paypal.helper.js'

const getAccessToken = async (): Promise<string> => {
  ensurePayPalConfig()

  const basicAuth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')

  const response = await fetch(`${resolvePayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  const raw = await response.text()
  const payload = parseJsonSafely<PayPalAccessTokenResponse & PayPalErrorPayload>(raw)

  if (!response.ok || !payload?.access_token) {
    throw new ApiError(
      resolvePayPalErrorStatus(response.status),
      buildPayPalErrorMessage(response.status, payload)
    )
  }

  return payload.access_token
}

const callPayPalApi = async <T>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<T> => {
  const accessToken = await getAccessToken()

  const response = await fetch(`${resolvePayPalBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const raw = await response.text()
  const payload = raw ? parseJsonSafely<T & PayPalErrorPayload>(raw) : null

  if (!response.ok || !payload) {
    throw new ApiError(
      resolvePayPalErrorStatus(response.status),
      buildPayPalErrorMessage(response.status, payload)
    )
  }

  return payload as T
}

const createOrder = async (input: PayPalCreateOrderInput): Promise<PayPalCreateOrderResponse> => {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Số tiền PayPal phải lớn hơn 0')
  }

  const currency = (input.currency || 'USD').trim().toUpperCase()

  return await callPayPalApi<PayPalCreateOrderResponse>('/v2/checkout/orders', 'POST', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: input.orderCode,
        custom_id: input.orderCode,
        invoice_id: input.orderCode,
        description: input.description || `Thanh toán đơn hàng ${input.orderCode}`,
        amount: {
          currency_code: currency,
          value: formatAmountByCurrency(input.amount, currency)
        }
      }
    ],
    application_context: {
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING'
    }
  })
}

const captureOrder = async (paypalOrderId: string): Promise<PayPalCaptureOrderResponse> => {
  const trimmedOrderId = paypalOrderId.trim()

  if (!trimmedOrderId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'paypalOrderId là bắt buộc')
  }

  const captureResponse = await callPayPalApi<PayPalCaptureApiResponse>(
    `/v2/checkout/orders/${encodeURIComponent(trimmedOrderId)}/capture`,
    'POST',
    {}
  )

  const captureId = captureResponse.purchase_units?.[0]?.payments?.captures?.[0]?.id

  if (!captureId) {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      'Không nhận được captureId từ PayPal sau khi thanh toán.'
    )
  }

  return {
    id: captureResponse.id,
    status: captureResponse.status,
    captureId,
    payerId: captureResponse.payer?.payer_id
  }
}

export const paypalService = {
  createOrder,
  captureOrder
}
