/**
 * Shipping domain types (GHN integration)
 */

export interface ShippingProvince {
  provinceId: number
  provinceName: string
}

export interface ShippingDistrict {
  districtId: number
  districtName: string
  provinceId: number
}

export interface ShippingWard {
  wardCode: string
  wardName: string
  districtId: number
}

export interface ShippingService {
  serviceId: number
  shortName: string
  serviceTypeId?: number
}

export interface ShippingQuoteRequest {
  toDistrictId: number
  toWardCode: string
  serviceId: number
  serviceTypeId?: number
  insuranceValue?: number
  weight?: number
  length?: number
  width?: number
  height?: number
  coupon?: string | null
  codValue?: number
  codFailedAmount?: number
}

export interface ShippingQuoteResponse {
  serviceId: number
  serviceTypeId?: number
  serviceName?: string
  totalFee: number
  rawFee: Record<string, unknown>
}
