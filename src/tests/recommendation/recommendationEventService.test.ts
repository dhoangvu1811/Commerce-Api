/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '~/config/prisma.js'
import { recommendationEventService } from '~/services/recommendationEventService.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('recommendationEventService.createBatch', () => {
  test('REC-EVT-HP-001 should return 0 and not call prisma when events is empty', async () => {
    const spy = vi.spyOn(prisma.recommendationEvent, 'createMany')

    const count = await recommendationEventService.createBatch([], null)

    expect(count).toBe(0)
    expect(spy).not.toHaveBeenCalled()
  })

  test('REC-EVT-HP-002 should map events and attach userId', async () => {
    vi.spyOn(prisma.recommendationEvent, 'createMany').mockResolvedValue({ count: 2 })

    const count = await recommendationEventService.createBatch(
      [
        {
          type: 'similar_impression',
          sourceProductId: 10,
          strategy: 'guest'
        },
        {
          type: 'similar_click',
          sourceProductId: 10,
          recommendedProductId: 20,
          position: 0,
          strategy: 'fallback',
          similarityScore: 0.55
        }
      ],
      99
    )

    expect(count).toBe(2)
    expect(prisma.recommendationEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          type: 'similar_impression',
          sourceProductId: 10,
          userId: 99,
          strategy: 'guest'
        }),
        expect.objectContaining({
          type: 'similar_click',
          sourceProductId: 10,
          recommendedProductId: 20,
          position: 0,
          strategy: 'fallback',
          userId: 99
        })
      ])
    })
  })

  test('REC-EVT-HP-003 should omit similarityScore when not finite', async () => {
    vi.spyOn(prisma.recommendationEvent, 'createMany').mockResolvedValue({ count: 1 })

    await recommendationEventService.createBatch(
      [
        {
          type: 'similar_impression',
          sourceProductId: 1,
          similarityScore: Number.NaN
        }
      ],
      null
    )

    const call = (prisma.recommendationEvent.createMany as any).mock.calls[0][0]
    expect(call.data[0].similarityScore).toBeNull()
  })
})
