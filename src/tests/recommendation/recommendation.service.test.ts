/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment.js'
import { productModel } from '~/models/productModel.js'
import { recommendationService } from '~/services/recommendationService.js'

const originalRecommenderUrl = env.RECOMMENDER_API_URL

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  env.RECOMMENDER_API_URL = originalRecommenderUrl
})

describe('recommendationService.getSimilarProducts', () => {
  test('REC-SIM-HP-001 should return personalized strategy when recommender responds with personalized', async () => {
    // Arrange
    env.RECOMMENDER_API_URL = 'http://localhost:8020'

    vi.spyOn(productModel, 'findOneById').mockResolvedValue({
      id: 8,
      status: 'active',
      categoryId: 9
    } as any)

    vi.spyOn(productModel, 'findByIds').mockResolvedValue([
      {
        id: 7,
        status: 'active',
        name: 'Demo similar product'
      } as any
    ])

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        message: 'OK',
        data: {
          sourceProductId: 8,
          strategyUsed: 'personalized',
          similarProducts: [{ productId: 7, score: 0.88331 }]
        }
      })
    })

    vi.stubGlobal('fetch', fetchMock)

    // Act
    const result = await recommendationService.getSimilarProducts('8', {
      topK: 5,
      minScore: 0.05,
      mode: 'personalized',
      userId: 12
    })

    // Assert
    const calledUrl = String(fetchMock.mock.calls[0]?.[0] || '')

    expect(result.sourceProductId).toBe(8)
    expect(result.strategy).toBe('personalized')
    expect(result.products[0]?.id).toBe(7)
    expect(result.products[0]?.similarityScore).toBe(0.8833)

    expect(calledUrl).toContain('/recommendations/similar/8')
    expect(calledUrl).toContain('mode=personalized')
    expect(calledUrl).toContain('user_id=12')
    expect(calledUrl).toContain('top_k=5')
  })

  test('REC-SIM-HP-002 should fallback by category when recommender is unavailable', async () => {
    // Arrange
    env.RECOMMENDER_API_URL = 'http://localhost:8020'

    vi.spyOn(productModel, 'findOneById').mockResolvedValue({
      id: 8,
      status: 'active',
      categoryId: 6
    } as any)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false
      })
    )

    vi.spyOn(productModel, 'getMany').mockResolvedValue({
      products: [
        { id: 8, status: 'active' },
        { id: 7, status: 'active' },
        { id: 6, status: 'active' }
      ],
      pagination: {
        page: 1,
        itemsPerPage: 6,
        totalItems: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    } as any)

    vi.spyOn(productModel, 'findByIds').mockResolvedValue([
      { id: 7, status: 'active', name: 'Fallback 1' },
      { id: 6, status: 'active', name: 'Fallback 2' }
    ] as any)

    // Act
    const result = await recommendationService.getSimilarProducts('8', {
      topK: 5,
      minScore: 0.05,
      mode: 'guest'
    })

    // Assert
    expect(result.strategy).toBe('fallback')
    expect(result.products.map(product => product.id)).toEqual([7, 6])
    expect(result.products[0]?.similarityScore).toBeGreaterThan(result.products[1]?.similarityScore || 0)
  })

  test('REC-SIM-ER-001 should return not found when source product is missing', async () => {
    // Arrange
    vi.spyOn(productModel, 'findOneById').mockResolvedValue(null)

    // Act + Assert
    await expect(recommendationService.getSimilarProducts('8')).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND
    })
  })

  test('REC-SIM-HP-003 should fallback when recommender candidates cannot be hydrated', async () => {
    // Arrange
    env.RECOMMENDER_API_URL = 'http://localhost:8020'

    vi.spyOn(productModel, 'findOneById').mockResolvedValue({
      id: 8,
      status: 'active',
      categoryId: 6
    } as any)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 200,
          message: 'OK',
          data: {
            sourceProductId: 8,
            strategyUsed: 'personalized',
            similarProducts: [{ productId: 9999, score: 0.92 }]
          }
        })
      })
    )

    vi.spyOn(productModel, 'findByIds')
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([{ id: 7, status: 'active', name: 'Fallback item' }] as any)

    vi.spyOn(productModel, 'getMany').mockResolvedValue({
      products: [{ id: 8, status: 'active' }, { id: 7, status: 'active' }],
      pagination: {
        page: 1,
        itemsPerPage: 9,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    } as any)

    // Act
    const result = await recommendationService.getSimilarProducts('8', {
      topK: 8,
      minScore: 0.05,
      mode: 'personalized',
      userId: 12
    })

    // Assert
    expect(result.strategy).toBe('fallback')
    expect(result.products.length).toBe(1)
    expect(result.products[0]?.id).toBe(7)
  })

  test('REC-SIM-HP-004 should use default topK and minScore when options are NaN', async () => {
    // Arrange
    env.RECOMMENDER_API_URL = 'http://localhost:8020'

    vi.spyOn(productModel, 'findOneById').mockResolvedValue({
      id: 8,
      status: 'active',
      categoryId: 6
    } as any)

    vi.spyOn(productModel, 'findByIds').mockResolvedValue([
      { id: 7, status: 'active', name: 'Candidate 1' }
    ] as any)

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        message: 'OK',
        data: {
          sourceProductId: 8,
          strategyUsed: 'guest',
          similarProducts: [{ productId: 7, score: 0.56 }]
        }
      })
    })

    vi.stubGlobal('fetch', fetchMock)

    // Act
    await recommendationService.getSimilarProducts('8', {
      topK: Number.NaN,
      minScore: Number.NaN,
      mode: 'guest'
    })

    // Assert
    const calledUrl = String(fetchMock.mock.calls[0]?.[0] || '')
    expect(calledUrl).toContain('top_k=8')
    expect(calledUrl).toContain('min_score=0.05')
  })
})
