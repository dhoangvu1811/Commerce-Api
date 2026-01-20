/**
 * Express type extensions
 * Mở rộng các types của Express để thêm custom properties
 */

import type { JwtDecodedPayload } from './common.types'

declare global {
  namespace Express {
    /**
     * Mở rộng Request interface
     */
    interface Request {
      /**
       * JWT decoded payload từ access token hoặc refresh token
       */
      jwtDecoded?: JwtDecodedPayload

      /**
       * Multer file upload
       */
      file?: Multer.File

      /**
       * Multiple file uploads
       */
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] }
    }

    /**
     * Mở rộng User interface cho Passport
     */
    interface User {
      _id: string
      email: string
      name: string
      role: string
      typeAccount: string
      isActive: boolean
      emailVerified: boolean
      avatar?: string
    }
  }
}

export {}
