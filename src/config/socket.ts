/**
 * Socket.IO Configuration
 * Cấu hình và khởi tạo Socket.IO server cho realtime notifications
 */

import type { Server as HttpServer } from 'http'
import { Server as SocketServer, type Socket } from 'socket.io'
import cookie from 'cookie'
import { JwtProvider } from '~/providers/JwtProvider.js'
import { WHITELIST_DOMAINS } from '~/utils/constants.js'
import { env } from '~/config/environment.js'
import { ROLES } from '~/constants/rbac.js'
import type { AccessTokenPayload } from '~/types/jwt.types.js'

/**
 * Socket.IO Event Constants
 * Định nghĩa tất cả event names để tránh typo
 */
export const SOCKET_EVENTS = {
  // Order lifecycle events
  ORDER_NEW: 'order:new',
  ORDER_STATUS_UPDATED: 'order:statusUpdated',
  ORDER_PAYMENT_UPDATED: 'order:paymentUpdated',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_MARK_PAID: 'order:markPaid',

  // Notification events
  NOTIFICATION_NEW: 'notification:new'
} as const

/**
 * Socket User Data gắn vào mỗi connection
 */
interface SocketUserData {
  _id: string
  email: string
  role: string
}

// Singleton Socket.IO instance
let io: SocketServer | null = null

/**
 * Trích xuất access token từ socket handshake
 * Thứ tự ưu tiên: auth.token → Authorization header → cookie accessToken
 */
const extractToken = (socket: Socket): string | null => {
  // 1. Từ auth payload (socket.io auth option)
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token as string
  }

  // 2. Từ Authorization header
  const authHeader = socket.handshake.headers?.authorization
  if (authHeader) {
    return authHeader.split(' ')[1] || null
  }

  // 3. Từ HttpOnly cookie (tự động gửi khi withCredentials: true)
  const cookieHeader = socket.handshake.headers?.cookie
  if (cookieHeader) {
    const cookies = cookie.parse(cookieHeader)
    if (cookies.accessToken) {
      return cookies.accessToken
    }
  }

  return null
}

/**
 * Khởi tạo Socket.IO server
 * - CORS cho phép giống như Express
 * - Auth middleware verify JWT token (hỗ trợ cả cookie và auth payload)
 * - Tự động join room theo userId và role
 */
export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin:
        env.BUILD_MODE === 'dev'
          ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
          : WHITELIST_DOMAINS,
      credentials: true
    },
    transports: ['websocket', 'polling']
  })

  // ── Auth middleware ─────────────────────────
  io.use((socket, next) => {
    try {
      const token = extractToken(socket)

      if (!token) {
        // eslint-disable-next-line no-console
        console.log(
          '[Socket Auth] Không tìm thấy token. Cookie header:',
          socket.handshake.headers?.cookie ? 'có' : 'không có'
        )

        return next(new Error('AUTH_NO_TOKEN'))
      }

      const decoded = JwtProvider.verifyAccessToken(token) as AccessTokenPayload
      // Gắn user data vào socket
      socket.data.user = {
        _id: decoded._id,
        email: decoded.email,
        role: decoded.role
      } as SocketUserData

      next()
    } catch (error: unknown) {
      const err = error as Error & { name?: string }

      // Phân biệt token hết hạn vs token không hợp lệ
      // Để FE biết cần refresh trước khi retry
      if (err.name === 'TokenExpiredError') {
        // eslint-disable-next-line no-console
        console.log('[Socket Auth] Access token đã hết hạn')

        return next(new Error('TOKEN_EXPIRED'))
      }

      // eslint-disable-next-line no-console
      console.log('[Socket Auth] Token không hợp lệ:', err.message)
      next(new Error('AUTH_INVALID_TOKEN'))
    }
  })

  // ── Connection handler ─────────────────────
  io.on('connection', socket => {
    const user = socket.data.user as SocketUserData
    const normalizedRole = String(user.role || '').toLowerCase()

    // Join room cá nhân theo userId → để gửi notification riêng
    socket.join(`user:${user._id}`)

    // Admin/Staff join room admin → nhận thông báo đơn hàng mới
    if (normalizedRole === ROLES.ADMIN || normalizedRole === ROLES.STAFF) {
      socket.join('admin')
    }

    // eslint-disable-next-line no-console
    console.log(`[Socket] ${user.email} connected (role: ${user.role})`)

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`[Socket] ${user.email} disconnected`)
    })
  })

  return io
}

/**
 * Lấy Socket.IO instance (singleton)
 * Dùng trong services để emit events
 */
export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.IO chưa được khởi tạo. Gọi initSocket() trước.')
  }

  return io
}

/**
 * Helper: Emit event đến user cụ thể
 */
export const emitToUser = (userId: string | number, event: string, data: unknown): void => {
  if (!io) return
  io.to(`user:${userId}`).emit(event, data)
}

/**
 * Helper: Emit event đến tất cả admin/staff
 * @param excludeUserId - Nếu truyền, loại trừ admin đang thực hiện hành động (tránh self-notification)
 */
export const emitToAdmin = (event: string, data: unknown, excludeUserId?: string | number): void => {
  if (!io) return

  if (excludeUserId) {
    // Loại trừ room cá nhân của admin đang thao tác
    io.to('admin').except(`user:${excludeUserId}`).emit(event, data)
  } else {
    io.to('admin').emit(event, data)
  }
}
