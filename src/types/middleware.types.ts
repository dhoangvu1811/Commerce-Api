/**
 * Express middleware type definitions
 */

import type { Request, Response, NextFunction } from 'express'
import type { JwtDecodedPayload } from './common.types.js'

/**
 * Async request handler wrapper
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

/**
 * Error request handler
 */
export type ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void

/**
 * Auth middleware functions
 */
export interface IAuthMiddleware {
  verifyToken: AsyncRequestHandler
  verifyAdmin: AsyncRequestHandler
  verifyUserOwnership: AsyncRequestHandler
  verifyActiveUser: AsyncRequestHandler
  verifySession: AsyncRequestHandler
  verifyTokenForLogout: AsyncRequestHandler
}

/**
 * Request với JWT decoded (typed)
 */
export interface AuthenticatedRequest extends Request {
  jwtDecoded: JwtDecodedPayload
}

/**
 * Request với file upload
 */
export interface FileUploadRequest extends Request {
  file: Express.Multer.File
}

/**
 * Request với multiple file uploads
 */
export interface MultiFileUploadRequest extends Request {
  files: Express.Multer.File[]
}

/**
 * Multer file filter function
 */
export type MulterFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void
) => void

/**
 * Controller method type
 */
export type ControllerMethod = AsyncRequestHandler

/**
 * Route handler với response typed
 */
export type TypedRequestHandler<
  TParams = Record<string, string>,
  TBody = unknown,
  TQuery = Record<string, string>
> = (
  req: Request<TParams, unknown, TBody, TQuery>,
  res: Response,
  next: NextFunction
) => Promise<void>
