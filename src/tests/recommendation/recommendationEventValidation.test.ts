/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextFunction, Request, Response } from 'express'
import { describe, expect, test, vi } from 'vitest'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { recommendationEventValidation } from '~/validations/recommendationEventValidation.js'

describe('recommendationEventValidation.ingest', () => {
  test('REC-VAL-HP-001 should call next() when body is valid', async () => {
    const req = {
      body: {
        events: [
          {
            type: 'similar_impression',
            sourceProductId: 5,
            strategy: 'personalized'
          }
        ]
      }
    } as Request
    const next = vi.fn()

    await recommendationEventValidation.ingest(req, {} as Response, next as NextFunction)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0]).toEqual([])
    expect((req as any).body.events[0].sourceProductId).toBe(5)
  })

  test('REC-VAL-ER-001 should reject empty events array', async () => {
    const req = { body: { events: [] } } as Request
    const next = vi.fn()

    await recommendationEventValidation.ingest(req, {} as Response, next as NextFunction)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
    const err = next.mock.calls[0]?.[0] as ApiError
    expect(err?.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  test('REC-VAL-ER-002 should reject similar_click without recommendedProductId', async () => {
    const req = {
      body: {
        events: [
          {
            type: 'similar_click',
            sourceProductId: 1
          }
        ]
      }
    } as Request
    const next = vi.fn()

    await recommendationEventValidation.ingest(req, {} as Response, next as NextFunction)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })

  test('REC-VAL-ER-003 should reject more than 20 events', async () => {
    const req = {
      body: {
        events: Array.from({ length: 21 }, (_, i) => ({
          type: 'similar_impression' as const,
          sourceProductId: i + 1
        }))
      }
    } as Request
    const next = vi.fn()

    await recommendationEventValidation.ingest(req, {} as Response, next as NextFunction)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})
