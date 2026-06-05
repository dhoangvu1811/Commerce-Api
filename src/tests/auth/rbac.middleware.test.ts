/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextFunction, Request, Response } from 'express'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { StatusCodes } from 'http-status-codes'
import { authMiddleware } from '~/middlewares/authMiddleware.js'
import { permissionModel } from '~/models/permissionModel.js'
import { ROLES } from '~/constants/rbac.js'

const makeRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    cookies: {},
    headers: {},
    jwtDecoded: undefined,
    ...overrides
  } as Request
}

const makeResponse = (): Response => {
  return {} as Response
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('authMiddleware.verifyAdmin (P0)', () => {
  test('RBAC-ADM-HP-001 should allow admin to pass', async () => {
    // Arrange
    const req = makeRequest({
      jwtDecoded: {
        _id: '1',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
        sessionId: 'session-admin-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    // Act
    await authMiddleware.verifyAdmin(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  test('RBAC-ADM-UN-001 should reject non-admin user', async () => {
    // Arrange
    const req = makeRequest({
      jwtDecoded: {
        _id: '2',
        email: 'user@example.com',
        role: ROLES.USER,
        sessionId: 'session-user-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    // Act
    await authMiddleware.verifyAdmin(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    const error = next.mock.calls[0][0]
    expect(error).toBeDefined()
    expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
    expect(error.message).toContain('quản trị viên')
  })

  test('RBAC-ADM-UN-002 should reject staff user', async () => {
    // Arrange
    const req = makeRequest({
      jwtDecoded: {
        _id: '3',
        email: 'staff@example.com',
        role: ROLES.STAFF,
        sessionId: 'session-staff-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    // Act
    await authMiddleware.verifyAdmin(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    const error = next.mock.calls[0][0]
    expect(error).toBeDefined()
    expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
  })
})

describe('authMiddleware.requirePermission (P0)', () => {
  test('RBAC-PERM-HP-001 should allow admin to bypass permission check', async () => {
    // Arrange
    const middleware = authMiddleware.requirePermission('manage_products')
    const req = makeRequest({
      jwtDecoded: {
        _id: '1',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
        sessionId: 'session-admin-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    // Act
    await middleware(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  test('RBAC-PERM-HP-002 should allow user with specific permission', async () => {
    // Arrange
    const middleware = authMiddleware.requirePermission('manage_orders')
    const req = makeRequest({
      jwtDecoded: {
        _id: '10',
        email: 'staff@example.com',
        role: ROLES.STAFF,
        sessionId: 'session-staff-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    vi.spyOn(permissionModel, 'checkUserPermission').mockResolvedValue(true)

    // Act
    await middleware(req, res, next)

    // Assert
    expect(permissionModel.checkUserPermission).toHaveBeenCalledWith(10, 'manage_orders')
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  test('RBAC-PERM-UN-001 should reject user without permission', async () => {
    // Arrange
    const middleware = authMiddleware.requirePermission('manage_products')
    const req = makeRequest({
      jwtDecoded: {
        _id: '10',
        email: 'staff@example.com',
        role: ROLES.STAFF,
        sessionId: 'session-staff-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    vi.spyOn(permissionModel, 'checkUserPermission').mockResolvedValue(false)

    // Act
    await middleware(req, res, next)

    // Assert
    expect(permissionModel.checkUserPermission).toHaveBeenCalledWith(10, 'manage_products')
    expect(next).toHaveBeenCalledTimes(1)
    const error = next.mock.calls[0][0]
    expect(error).toBeDefined()
    expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
    expect(error.message).toContain('manage_products')
  })

  test('RBAC-PERM-UN-002 should reject unauthenticated request', async () => {
    // Arrange
    const middleware = authMiddleware.requirePermission('manage_products')
    const req = makeRequest({
      jwtDecoded: undefined
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    // Act
    await middleware(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    const error = next.mock.calls[0][0]
    expect(error).toBeDefined()
    expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED)
  })
})

describe('authMiddleware.requireAnyPermission (P1)', () => {
  test('RBAC-ANY-HP-001 should allow admin to bypass', async () => {
    // Arrange
    const middleware = authMiddleware.requireAnyPermission(['manage_products', 'view_analytics'])
    const req = makeRequest({
      jwtDecoded: {
        _id: '1',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
        sessionId: 'session-admin-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    // Act
    await middleware(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  test('RBAC-ANY-HP-002 should allow user with at least one permission', async () => {
    // Arrange
    const middleware = authMiddleware.requireAnyPermission(['manage_products', 'manage_orders'])
    const req = makeRequest({
      jwtDecoded: {
        _id: '10',
        email: 'staff@example.com',
        role: ROLES.STAFF,
        sessionId: 'session-staff-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    vi.spyOn(permissionModel, 'checkUserAnyPermission').mockResolvedValue(true)

    // Act
    await middleware(req, res, next)

    // Assert
    expect(permissionModel.checkUserAnyPermission).toHaveBeenCalledWith(10, ['manage_products', 'manage_orders'])
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  test('RBAC-ANY-UN-001 should reject user without any of the permissions', async () => {
    // Arrange
    const middleware = authMiddleware.requireAnyPermission(['manage_products', 'manage_users'])
    const req = makeRequest({
      jwtDecoded: {
        _id: '10',
        email: 'staff@example.com',
        role: ROLES.STAFF,
        sessionId: 'session-staff-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    vi.spyOn(permissionModel, 'checkUserAnyPermission').mockResolvedValue(false)

    // Act
    await middleware(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    const error = next.mock.calls[0][0]
    expect(error).toBeDefined()
    expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
  })
})

describe('authMiddleware.requireAllPermissions (P2)', () => {
  test('RBAC-ALL-HP-001 should allow admin to bypass', async () => {
    // Arrange
    const middleware = authMiddleware.requireAllPermissions(['manage_products', 'manage_orders'])
    const req = makeRequest({
      jwtDecoded: {
        _id: '1',
        email: 'admin@example.com',
        role: 'admin',
        sessionId: 'session-admin-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    // Act
    await middleware(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  test('RBAC-ALL-HP-002 should allow user with all required permissions', async () => {
    // Arrange
    const middleware = authMiddleware.requireAllPermissions(['manage_products', 'manage_orders'])
    const req = makeRequest({
      jwtDecoded: {
        _id: '10',
        email: 'staff@example.com',
        role: ROLES.STAFF,
        sessionId: 'session-staff-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    vi.spyOn(permissionModel, 'checkUserAllPermissions').mockResolvedValue(true)

    // Act
    await middleware(req, res, next)

    // Assert
    expect(permissionModel.checkUserAllPermissions).toHaveBeenCalledWith(10, ['manage_products', 'manage_orders'])
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  test('RBAC-ALL-UN-001 should reject user missing one permission', async () => {
    // Arrange
    const middleware = authMiddleware.requireAllPermissions(['manage_products', 'manage_orders'])
    const req = makeRequest({
      jwtDecoded: {
        _id: '10',
        email: 'staff@example.com',
        role: ROLES.STAFF,
        sessionId: 'session-staff-001'
      } as any
    })
    const res = makeResponse()
    const next = vi.fn() as NextFunction

    vi.spyOn(permissionModel, 'checkUserAllPermissions').mockResolvedValue(false)

    // Act
    await middleware(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledTimes(1)
    const error = next.mock.calls[0][0]
    expect(error).toBeDefined()
    expect(error.statusCode).toBe(StatusCodes.FORBIDDEN)
  })
})
