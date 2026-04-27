import { describe, expect, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

describe('aiChatValidation.chat', () => {
  it('passes valid body', async () => {
    const { aiChatValidation } = await import('~/validations/aiChatValidation.js')
    const req = {
      body: { message: 'hello', locale: 'vi' }
    } as unknown as Request
    const next = vi.fn() as NextFunction
    aiChatValidation.chat(req, {} as Response, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.body).toMatchObject({ message: 'hello', locale: 'vi' })
  })

  it('rejects empty message', async () => {
    const { aiChatValidation } = await import('~/validations/aiChatValidation.js')
    const req = { body: { message: '' } } as unknown as Request
    const next = vi.fn() as NextFunction
    aiChatValidation.chat(req, {} as Response, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
