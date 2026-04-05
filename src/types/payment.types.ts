import type { OrderStatus, PaymentStatus } from '@prisma/client'

export interface CreatePaypalOrderResult {
  orderCode: string
  paypalOrderId: string
  paypalStatus: string
  currency: string
  amount: number
  paymentStatus: PaymentStatus
}

export interface CapturePaypalOrderResult {
  orderCode: string
  paypalOrderId: string
  paypalCaptureId: string
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  paidAt: string
}

export interface PayPalErrorDetail {
  issue?: string
  description?: string
}

export interface PayPalErrorPayload {
  name?: string
  message?: string
  details?: PayPalErrorDetail[]
  debug_id?: string
}

export interface PayPalAccessTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface PayPalCreateOrderInput {
  amount: number
  currency: string
  orderCode: string
  description?: string
}

export interface PayPalCreateOrderResponse {
  id: string
  status: string
}

export interface PayPalCaptureApiResponse {
  id: string
  status: string
  payer?: {
    payer_id?: string
  }
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string
        status: string
      }>
    }
  }>
}

export interface PayPalCaptureOrderResponse {
  id: string
  status: string
  captureId: string
  payerId?: string
}