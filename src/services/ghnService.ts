/**
 * GHN Service
 * Wrap calls to GHN APIs for location data and shipping fee quote.
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { env } from '~/config/environment.js'
import type {
  ShippingProvince,
  ShippingDistrict,
  ShippingWard,
  ShippingService,
  ShippingQuoteRequest,
  ShippingQuoteResponse
} from '~/types/shipping.types.js'

interface GhnResponse<T> {
  code: number
  message: string
  data: T
}

interface GhnErrorResponse {
  code?: number
  message?: string
  data?: unknown
}

const ensureTokenConfigured = (): void => {
  if (!env.GHN_TOKEN) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Cấu hình GHN chưa đầy đủ. Vui lòng kiểm tra GHN_TOKEN.'
    )
  }
}

const ensureShippingConfigConfigured = (): void => {
  if (
    !Number.isInteger(env.GHN_SHOP_ID) ||
    env.GHN_SHOP_ID <= 0 ||
    !Number.isInteger(env.GHN_FROM_DISTRICT_ID) ||
    env.GHN_FROM_DISTRICT_ID <= 0
  ) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Cấu hình GHN chưa đầy đủ. Vui lòng kiểm tra GHN_SHOP_ID, GHN_FROM_DISTRICT_ID.'
    )
  }
}

const parsePositiveIntOr = (value: string, fallback: number): number => {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const getFallbackFee = (): number => {
  return parsePositiveIntOr(env.GHN_FALLBACK_FEE, 25000)
}

const getFromWardCode = (): string | undefined => {
  const wardCode = env.GHN_FROM_WARD_ID?.trim()
  if (!wardCode || wardCode.toLowerCase() === 'string') return undefined

  return wardCode
}

const ghnFetch = async <T>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
  options?: { includeShopId?: boolean }
): Promise<T> => {
  ensureTokenConfigured()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    token: env.GHN_TOKEN
  }

  if (options?.includeShopId) {
    headers.ShopId = String(env.GHN_SHOP_ID)
  }

  const response = await fetch(`${env.GHN_API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    const rawError = await response.text()
    let ghnErrorMessage = ''

    try {
      const parsed = JSON.parse(rawError) as GhnErrorResponse
      ghnErrorMessage = parsed.message || rawError
    } catch {
      ghnErrorMessage = rawError
    }

    const suffix = ghnErrorMessage ? ` - ${ghnErrorMessage}` : ''

    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      `GHN request thất bại với status ${response.status}${suffix}`
    )
  }

  const data = (await response.json()) as GhnResponse<T>

  if (!data || typeof data.code !== 'number' || data.code !== 200) {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      data?.message || 'Không lấy được dữ liệu từ GHN'
    )
  }

  return data.data
}

const getProvinces = async (): Promise<ShippingProvince[]> => {
  const provinces = await ghnFetch<Array<{ ProvinceID: number; ProvinceName: string }>>(
    '/master-data/province',
    'GET'
  )

  return provinces.map((item) => ({
    provinceId: item.ProvinceID,
    provinceName: item.ProvinceName
  }))
}

const getDistricts = async (provinceId: number): Promise<ShippingDistrict[]> => {
  const districts = await ghnFetch<
    Array<{ DistrictID: number; DistrictName: string; ProvinceID: number }>
  >('/master-data/district', 'POST', { province_id: provinceId })

  return districts.map((item) => ({
    districtId: item.DistrictID,
    districtName: item.DistrictName,
    provinceId: item.ProvinceID
  }))
}

const getWards = async (districtId: number): Promise<ShippingWard[]> => {
  const wards = await ghnFetch<Array<{ WardCode: string; WardName: string }>>(
    '/master-data/ward',
    'POST',
    { district_id: districtId }
  )

  return wards.map((item) => ({
    wardCode: item.WardCode,
    wardName: item.WardName,
    districtId
  }))
}

const getAvailableServices = async (toDistrictId: number): Promise<ShippingService[]> => {
  ensureShippingConfigConfigured()

  const services = await ghnFetch<Array<{ service_id: number; short_name: string; service_type_id?: number }>>(
    '/v2/shipping-order/available-services',
    'POST',
    {
      shop_id: env.GHN_SHOP_ID,
      from_district: env.GHN_FROM_DISTRICT_ID,
      to_district: toDistrictId
    },
    { includeShopId: true }
  )

  return services.map((item) => ({
    serviceId: item.service_id,
    shortName: item.short_name,
    serviceTypeId: item.service_type_id
  }))
}

const quoteFee = async (payload: ShippingQuoteRequest): Promise<ShippingQuoteResponse> => {
  ensureShippingConfigConfigured()

  const defaultWeight = parsePositiveIntOr(env.GHN_DEFAULT_WEIGHT, 500)
  const defaultLength = parsePositiveIntOr(env.GHN_DEFAULT_LENGTH, 20)
  const defaultWidth = parsePositiveIntOr(env.GHN_DEFAULT_WIDTH, 20)
  const defaultHeight = parsePositiveIntOr(env.GHN_DEFAULT_HEIGHT, 10)
  const fromWardCode = getFromWardCode()
  const toWardCode = payload.toWardCode?.trim()

  const selectedServiceId = payload.serviceId

  if (!selectedServiceId || !Number.isInteger(selectedServiceId) || selectedServiceId <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vui lòng chọn dịch vụ vận chuyển hợp lệ')
  }

  if (!Number.isInteger(payload.toDistrictId) || payload.toDistrictId <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Quận/huyện giao hàng không hợp lệ')
  }

  if (!toWardCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Phường/xã giao hàng không hợp lệ')
  }

  const resolvedServiceTypeId = payload.serviceTypeId

  const feePayload: Record<string, unknown> = {
    shop_id: env.GHN_SHOP_ID,
    from_district_id: env.GHN_FROM_DISTRICT_ID,
    to_district_id: payload.toDistrictId,
    to_ward_code: toWardCode,
    height: payload.height ?? defaultHeight,
    length: payload.length ?? defaultLength,
    width: payload.width ?? defaultWidth,
    weight: payload.weight ?? defaultWeight,
    insurance_value: payload.insuranceValue ?? 0,
    cod_value: payload.codValue ?? 0,
    cod_failed_amount: payload.codFailedAmount ?? 0,
    coupon: payload.coupon ?? null,
    service_id: selectedServiceId,
    items: []
  }

  if (fromWardCode) {
    feePayload.from_ward_code = fromWardCode
  }

  try {
    const fee = await ghnFetch<{
      total: number
      service_id: number
      service_type_id: number
      [key: string]: unknown
    }>('/v2/shipping-order/fee', 'POST', feePayload, { includeShopId: true })

    const resolvedServiceId =
      Number.isInteger(fee.service_id) && fee.service_id > 0
        ? fee.service_id
        : selectedServiceId || 999999

    return {
      serviceId: resolvedServiceId,
      serviceTypeId: fee.service_type_id,
      serviceName: undefined,
      totalFee: Number(fee.total || 0),
      rawFee: fee
    }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode !== StatusCodes.BAD_GATEWAY) {
      throw error
    }

    const fallbackFee = getFallbackFee()
    const fallbackServiceId = selectedServiceId || 999999

    process.stderr.write(
      `[GHN] Quote fee fallback applied. Reason: ${error instanceof Error ? error.message : 'Unknown error'}\n`
    )

    return {
      serviceId: fallbackServiceId,
      serviceTypeId: resolvedServiceTypeId,
      serviceName: 'Fallback',
      totalFee: fallbackFee,
      rawFee: {
        fallback: true,
        reason: error instanceof Error ? error.message : 'Unknown error',
        configuredFallbackFee: fallbackFee
      }
    }
  }
}

export const ghnService = {
  getProvinces,
  getDistricts,
  getWards,
  quoteFee,
  getAvailableServices
}
