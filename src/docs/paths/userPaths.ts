import { registry } from '../openApiRegistry.js'

import { z } from 'zod'
import { loginSchema, registerSchema } from '~/validations/userValidation.js'

registry.registerPath({
  method: 'post',
  path: '/V1/users/login',
  tags: ['Users & Auth'],
  summary: 'Đăng nhập',
  request: { body: { content: { 'application/json': { schema: loginSchema } } } },
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'post',
  path: '/V1/users/register',
  tags: ['Users & Auth'],
  summary: 'Đăng ký',
  request: { body: { content: { 'application/json': { schema: registerSchema } } } },
  responses: { 201: { description: 'Created' } }
})

registry.registerPath({
  method: 'post',
  path: '/V1/users/refresh-token',
  tags: ['Users & Auth'],
  summary: 'Refresh JWT Token',
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'post',
  path: '/V1/users/logout',
  tags: ['Users & Auth'],
  summary: 'Đăng xuất',
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'get',
  path: '/V1/users/me',
  tags: ['Users & Auth'],
  summary: 'Lấy thông tin cá nhân',
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'put',
  path: '/V1/users/me',
  tags: ['Users & Auth'],
  summary: 'Cập nhật thông tin cá nhân',
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'get',
  path: '/V1/users/all',
  tags: ['Users (Admin)'],
  summary: 'Lấy tất cả users',
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'post',
  path: '/V1/users/create',
  tags: ['Users (Admin)'],
  summary: 'Tạo user mới',
  security: [{ bearerAuth: [] }],
  responses: { 201: { description: 'Created' } }
})

registry.registerPath({
  method: 'put',
  path: '/V1/users/update/{id}',
  tags: ['Users (Admin)'],
  summary: 'Cập nhật user',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'delete',
  path: '/V1/users/delete/{id}',
  tags: ['Users (Admin)'],
  summary: 'Xóa user',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

// === CÁC ROUTE BỔ SUNG ===
registry.registerPath({ method: 'get', path: '/V1/users/stats', tags: ['Users (Admin)'], security: [{ bearerAuth: [] }], summary: 'Thống kê người dùng', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'get', path: '/V1/users/verify-account', tags: ['Users & Auth'], summary: 'Xác thực tài khoản qua email', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/users/forgot-password', tags: ['Users & Auth'], summary: 'Quên mật khẩu (Gửi email)', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/users/reset-password', tags: ['Users & Auth'], summary: 'Đặt lại mật khẩu', responses: { 200: { description: 'OK' } } })

registry.registerPath({ method: 'get', path: '/V1/users/auth/google', tags: ['Users & Auth'], summary: 'Đăng nhập Google OAuth', responses: { 200: { description: 'Redirect to Google' } } })
registry.registerPath({ method: 'get', path: '/V1/users/auth/google/failure', tags: ['Users & Auth'], summary: 'Lỗi Google OAuth', responses: { 400: { description: 'Failed' } } })
registry.registerPath({ method: 'get', path: '/V1/users/auth/facebook', tags: ['Users & Auth'], summary: 'Đăng nhập Facebook OAuth', responses: { 200: { description: 'Redirect to Facebook' } } })
registry.registerPath({ method: 'get', path: '/V1/users/auth/facebook/failure', tags: ['Users & Auth'], summary: 'Lỗi Facebook OAuth', responses: { 400: { description: 'Failed' } } })

registry.registerPath({ method: 'put', path: '/V1/users/me/password', tags: ['Users & Auth'], security: [{ bearerAuth: [] }], summary: 'Đổi mật khẩu', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/users/upload-avatar', tags: ['Users & Auth'], security: [{ bearerAuth: [] }], summary: 'Upload Avatar', request: { body: { content: { 'multipart/form-data': { schema: z.object({ avatar: z.string().openapi({ format: 'binary' }) }) } } } }, responses: { 200: { description: 'OK' } } })

registry.registerPath({ method: 'get', path: '/V1/users/my-sessions', tags: ['Users & Auth'], security: [{ bearerAuth: [] }], summary: 'Danh sách thiết bị đăng nhập', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/users/revoke-my-session', tags: ['Users & Auth'], security: [{ bearerAuth: [] }], summary: 'Đăng xuất khỏi thiết bị khác', responses: { 200: { description: 'OK' } } })
