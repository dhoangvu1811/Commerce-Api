/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextFunction, Request, Response } from 'express'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { sessionModel } from '~/models/sessionModel.js'
import { JwtProvider } from '~/providers/JwtProvider.js'

const makeRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    cookies: {},
    headers: {},
    ...overrides
  } as Request
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('authMiddleware.verifyOptionalToken', () => {
  test('AUTH-OPT-HP-001 should continue as guest when no token is provided', async () => {
    // Arrange
    const req = makeRequest()
    const next = vi.fn() as NextFunction

    // Act
    await authMiddleware.verifyOptionalToken(req, {} as Response, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.jwtDecoded).toBeUndefined()
  })

  test('AUTH-OPT-HP-002 should continue as guest when token is invalid', async () => {
    // Arrange
    const req = makeRequest({
      headers: {
        authorization: 'Bearer invalid-token'
      }
    })
    const next = vi.fn() as NextFunction

    vi.spyOn(JwtProvider, 'verifyAccessToken').mockImplementation(() => {
      throw new Error('Invalid token')
    })

    // Act
    await authMiddleware.verifyOptionalToken(req, {} as Response, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.jwtDecoded).toBeUndefined()
  })

  test('AUTH-OPT-HP-003 should continue as guest when session is revoked', async () => {
    // Arrange
    const req = makeRequest({
      headers: {
        authorization: 'Bearer valid-token'
      }
    })
    const next = vi.fn() as NextFunction

    vi.spyOn(JwtProvider, 'verifyAccessToken').mockReturnValue({
      _id: '12',
      email: 'user@example.com',
      role: 'user',
      sessionId: 'session-123'
    } as any)

    vi.spyOn(sessionModel, 'findBySessionId').mockResolvedValue(null)

    // Act
    await authMiddleware.verifyOptionalToken(req, {} as Response, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.jwtDecoded).toBeUndefined()
  })

  test('AUTH-OPT-HP-004 should attach jwtDecoded when token and session are valid', async () => {
    // Arrange
    const req = makeRequest({
      headers: {
        authorization: 'Bearer valid-token'
      }
    })
    const next = vi.fn() as NextFunction

    vi.spyOn(JwtProvider, 'verifyAccessToken').mockReturnValue({
      _id: '12',
      email: 'user@example.com',
      role: 'user',
      sessionId: 'session-123'
    } as any)

    vi.spyOn(sessionModel, 'findBySessionId').mockResolvedValue({
      userId: 12
    } as any)

    // Act
    await authMiddleware.verifyOptionalToken(req, {} as Response, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.jwtDecoded?._id).toBe('12')
    expect(req.jwtDecoded?.sessionId).toBe('session-123')
  })
})
