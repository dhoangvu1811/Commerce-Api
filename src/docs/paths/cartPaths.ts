import { registry } from '../openApiRegistry.js'
import { createApiResponseSchema } from '../utils.js'
import { z } from 'zod'

registry.registerPath({
  method: 'get',
  path: '/V1/cart',
  tags: ['Cart'],
  summary: 'Lấy giỏ hàng của tôi',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Thành công') } }
    }
  }
})

registry.registerPath({
  method: 'post',
  path: '/V1/cart/add',
  tags: ['Cart'],
  summary: 'Thêm sản phẩm vào giỏ',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            productId: z.number().openapi({ example: 42 }),
            quantity: z.number().min(1).openapi({ example: 1 })
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Thêm thành công') } }
    }
  }
})

registry.registerPath({
  method: 'put',
  path: '/V1/cart/update',
  tags: ['Cart'],
  summary: 'Cập nhật số lượng trong giỏ',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            productId: z.number().openapi({ example: 42 }),
            quantity: z.number().openapi({ example: 2 })
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Cập nhật thành công') } }
    }
  }
})

registry.registerPath({
  method: 'delete',
  path: '/V1/cart/remove/{productId}',
  tags: ['Cart'],
  summary: 'Xóa sản phẩm khỏi giỏ',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ productId: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'post',
  path: '/V1/cart/sync',
  tags: ['Cart'],
  summary: 'Đồng bộ giỏ hàng (Local Storage -> Server)',
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'delete',
  path: '/V1/cart/clear',
  tags: ['Cart'],
  summary: 'Xóa toàn bộ giỏ hàng',
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: 'OK' } }
})
