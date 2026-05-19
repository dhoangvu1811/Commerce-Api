import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'

export const registry = new OpenAPIRegistry()

// Đăng ký phương thức bảo mật (JWT Bearer) cho toàn hệ thống
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Nhập JWT token của bạn vào đây (không cần thêm chữ "Bearer ")'
})
