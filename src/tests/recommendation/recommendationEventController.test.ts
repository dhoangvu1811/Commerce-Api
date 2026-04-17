/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextFunction, Request, Response } from 'express'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { StatusCodes } from 'http-status-codes'
import { recommendationEventController } from '~/controllers/recommendationEventController.js'
import { recommendationEventService } from '~/services/recommendationEventService.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('recommendationEventController.ingest', () => {
  test('REC-CTL-HP-001 should return accepted count and pass null userId when guest', async () => {
    vi.spyOn(recommendationEventService, 'createBatch').mockResolvedValue(1)

    const req = {
      body: {
        events: [{ type: 'similar_impression', sourceProductId: 3 }]
      },
      jwtDecoded: undefined
    } as unknown as Request

    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    const res = { status, json } as unknown as Response
    const next = vi.fn() as NextFunction

    await recommendationEventController.ingest(req, res, next)

    expect(recommendationEventService.createBatch).toHaveBeenCalledWith(
      [{ type: 'similar_impression', sourceProductId: 3 }],
      null
    )
    expect(status).toHaveBeenCalledWith(StatusCodes.OK)
    expect(json).toHaveBeenCalledWith({
      code: StatusCodes.OK,
      message: 'Đã ghi nhận sự kiện gợi ý',
      data: { accepted: 1 }
    })
    expect(next).not.toHaveBeenCalled()
  })

  test('REC-CTL-HP-002 should pass userId from jwtDecoded._id', async () => {
    vi.spyOn(recommendationEventService, 'createBatch').mockResolvedValue(2)

    const req = {
      body: {
        events: [
          { type: 'similar_click', sourceProductId: 1, recommendedProductId: 2, position: 0 }
        ]
      },
      jwtDecoded: { _id: '15' }
    } as unknown as Request

    const json = vi.fn()
    const res = { status: vi.fn().mockReturnValue({ json }), json } as unknown as Response

    await recommendationEventController.ingest(req, res as any, vi.fn())

    expect(recommendationEventService.createBatch).toHaveBeenCalledWith(
      [
        {
          type: 'similar_click',
          sourceProductId: 1,
          recommendedProductId: 2,
          position: 0
        }
      ],
      15
    )
  })

  test('REC-CTL-ER-001 should forward errors to next', async () => {
    vi.spyOn(recommendationEventService, 'createBatch').mockRejectedValue(new Error('db down'))

    const req = {
      body: { events: [{ type: 'similar_impression', sourceProductId: 1 }] }
    } as unknown as Request
    const next = vi.fn() as NextFunction

    await recommendationEventController.ingest(req, {} as Response, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
