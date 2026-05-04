/**
 * Recommendation Service
 * Tích hợp với Python TF-IDF service để lấy sản phẩm tương tự.
 * Nếu service ngoài lỗi, tự động fallback theo cùng danh mục.
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { env } from '~/config/environment.js'
import { productModel } from '~/models/productModel.js'

interface SimilarCandidate {
  productId: number
  score: number
}

type RecommendationMode = 'auto' | 'guest' | 'personalized'
type RecommendationStrategy = 'guest' | 'personalized' | 'fallback'

interface RecommenderApiResponse {
  code: number
  message: string
  data?: {
    sourceProductId: number
    modeRequested?: RecommendationMode
    strategyUsed?: 'guest' | 'personalized'
    similarProducts: SimilarCandidate[]
  }
}

interface SimilarProduct extends Record<string, unknown> {
  id: number
  status?: string
  similarityScore: number
}

interface SimilarProductsResult {
  sourceProductId: number
  strategy: RecommendationStrategy
  products: SimilarProduct[]
}

interface RecommenderFetchResult {
  strategy?: Exclude<RecommendationStrategy, 'fallback'>
  candidates: SimilarCandidate[]
}

const parsePositiveInt = (value: string, fieldName: string): number => {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `${fieldName} không hợp lệ`)
  }

  return parsed
}

const clampInt = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min

  return Math.max(min, Math.min(max, Math.floor(value)))
}

const clampFloat = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min

  return Math.max(min, Math.min(max, value))
}

const parseRecommendationMode = (value: unknown): RecommendationMode => {
  const normalized = String(value || 'auto').toLowerCase()
  if (normalized === 'guest') return 'guest'
  if (normalized === 'personalized') return 'personalized'

  return 'auto'
}

const fetchFromRecommender = async (
  sourceProductId: number,
  topK: number,
  minScore: number,
  mode: RecommendationMode,
  userId?: number
): Promise<RecommenderFetchResult> => {
  const baseUrl = env.RECOMMENDER_API_URL?.trim()
  if (!baseUrl) {
    return { candidates: [] }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const url = new URL(`/recommendations/similar/${sourceProductId}`, baseUrl)
    url.searchParams.set('top_k', String(topK))
    url.searchParams.set('min_score', String(minScore))
    url.searchParams.set('mode', mode)
    if (typeof userId === 'number' && Number.isInteger(userId) && userId > 0) {
      url.searchParams.set('user_id', String(userId))
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    const hfToken = env.RECOMMENDER_HF_TOKEN?.trim()
    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers
    })

    if (!response.ok) {
      return { candidates: [] }
    }

    const payload = (await response.json()) as RecommenderApiResponse
    const similarProducts = payload.data?.similarProducts || []
    const strategyUsed = payload.data?.strategyUsed
    const strategy =
      strategyUsed === 'personalized' || strategyUsed === 'guest' ? strategyUsed : undefined

    return {
      strategy,
      candidates: similarProducts
        .filter(item => Number.isInteger(item.productId) && item.productId > 0)
        .map(item => ({
          productId: item.productId,
          score: Number(item.score) || 0
        }))
    }
  } catch {
    return { candidates: [] }
  } finally {
    clearTimeout(timeout)
  }
}

const buildFallbackCandidates = async (
  sourceProductId: number,
  categoryId: number,
  topK: number
): Promise<SimilarCandidate[]> => {
  const fallbackResult = await productModel.getMany(
    { categoryId, status: 'active' },
    1,
    topK + 1,
    { selled: 'desc' }
  )

  const fallbackProducts = (fallbackResult.products || []).filter(
    product => Number(product.id) !== sourceProductId
  )

  return fallbackProducts.slice(0, topK).map((product, index) => ({
    productId: Number(product.id),
    score: Number((1 - index / (topK + 1)).toFixed(4))
  }))
}

const hydrateProducts = async (candidates: SimilarCandidate[]): Promise<SimilarProduct[]> => {
  if (candidates.length === 0) {
    return []
  }

  const uniqueIds = Array.from(new Set(candidates.map(candidate => candidate.productId)))
  const products = (await productModel.findByIds(uniqueIds)) as Array<Record<string, unknown>>

  const scoreById = new Map<number, number>()
  candidates.forEach(candidate => {
    scoreById.set(candidate.productId, candidate.score)
  })

  const productById = new Map<number, Record<string, unknown>>()
  products.forEach(product => {
    if (typeof product.id === 'number') {
      productById.set(product.id, product)
    }
  })

  return uniqueIds
    .map(productId => productById.get(productId))
    .filter((product): product is Record<string, unknown> => Boolean(product))
    .filter(product => (product.status as string | undefined) !== 'inactive')
    .map(product => ({
      ...product,
      id: product.id as number,
      similarityScore: Number((scoreById.get(product.id as number) || 0).toFixed(4))
    }))
}

const getSimilarProducts = async (
  productId: string,
  options: { topK?: number; minScore?: number; mode?: RecommendationMode; userId?: number } = {}
): Promise<SimilarProductsResult> => {
  const sourceProductId = parsePositiveInt(productId, 'ID sản phẩm')

  const sourceProduct = await productModel.findOneById(sourceProductId)
  if (!sourceProduct || sourceProduct.status !== 'active') {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm để gợi ý')
  }

  const rawTopK = Number.isFinite(options.topK as number) ? Number(options.topK) : 8
  const rawMinScore = Number.isFinite(options.minScore as number) ? Number(options.minScore) : 0.05

  const topK = clampInt(rawTopK, 1, 24)
  const minScore = clampFloat(rawMinScore, 0, 1)
  const mode = parseRecommendationMode(options.mode)
  const userId =
    typeof options.userId === 'number' && Number.isInteger(options.userId) && options.userId > 0
      ? options.userId
      : undefined

  const recommenderResult = await fetchFromRecommender(sourceProductId, topK, minScore, mode, userId)
  let strategy: RecommendationStrategy = recommenderResult.strategy || 'guest'
  let candidates = recommenderResult.candidates

  if (candidates.length === 0) {
    strategy = 'fallback'
    candidates = await buildFallbackCandidates(sourceProductId, Number(sourceProduct.categoryId), topK)
  }

  let products = await hydrateProducts(candidates)

  // Nếu recommender trả ID lỗi thời (đã inactive/xóa), chủ động fallback để tránh trả danh sách rỗng.
  if (products.length === 0 && strategy !== 'fallback') {
    strategy = 'fallback'
    candidates = await buildFallbackCandidates(sourceProductId, Number(sourceProduct.categoryId), topK)
    products = await hydrateProducts(candidates)
  }

  return {
    sourceProductId,
    strategy,
    products
  }
}

export const recommendationService = {
  getSimilarProducts
}
