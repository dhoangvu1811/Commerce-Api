import { registry } from '../openApiRegistry.js'
import { createApiResponseSchema, errorResponseSchema } from '../utils.js'
import { z } from 'zod'

registry.registerPath({
  method: 'post',
  path: '/V1/orders/create',
  tags: ['Orders'],
  summary: 'Tạo đơn hàng mới',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            items: z.array(z.object({
              productId: z.number().openapi({ example: 42 }),
              quantity: z.number().min(1).openapi({ example: 2 })
            })).min(1),
            shippingAddressId: z.number().openapi({ example: 5 }),
            shippingServiceId: z.number().openapi({ example: 53320 }),
            paymentMethod: z.enum(['COD', 'PAYPAL']).openapi({ example: 'COD' }),
            voucherCode: z.string().optional().openapi({ example: 'SAVE10' })
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Tạo đơn hàng thành công', 201) } }
    },
    400: {
      description: 'Lỗi validation hoặc hết hàng',
      content: { 'application/json': { schema: errorResponseSchema('Validation Error', 400) } }
    }
  }
})

registry.registerPath({
  method: 'get',
  path: '/V1/orders/my-orders',
  tags: ['Orders'],
  summary: 'Lấy lịch sử đơn hàng',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Thành công') } }
    }
  }
})

registry.registerPath({
  method: 'get',
  path: '/V1/orders/details/{id}',
  tags: ['Orders'],
  summary: 'Chi tiết đơn hàng (User)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ example: 'ORD-123456' }) })
  },
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Thành công') } }
    }
  }
})

registry.registerPath({
  method: 'post',
  path: '/V1/orders/cancel/{id}',
  tags: ['Orders'],
  summary: 'Hủy đơn hàng (User)',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

// === ADMIN ROUTES ===
registry.registerPath({
  method: 'get',
  path: '/V1/orders/all',
  tags: ['Orders (Admin)'],
  summary: 'Lấy toàn bộ đơn hàng (Admin)',
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'get',
  path: '/V1/orders/dashboard-summary',
  tags: ['Orders (Admin)'],
  summary: 'Thống kê tổng quan (Dashboard)',
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'get',
  path: '/V1/orders/admin/details/{id}',
  tags: ['Orders (Admin)'],
  summary: 'Chi tiết đơn hàng (Admin)',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'put',
  path: '/V1/orders/admin/update/{id}',
  tags: ['Orders (Admin)'],
  summary: 'Cập nhật trạng thái đơn hàng',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'put',
  path: '/V1/orders/admin/update-payment/{id}',
  tags: ['Orders (Admin)'],
  summary: 'Cập nhật trạng thái thanh toán',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'post',
  path: '/V1/orders/admin/mark-paid/{id}',
  tags: ['Orders (Admin)'],
  summary: 'Đánh dấu đã thanh toán',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'post',
  path: '/V1/orders/admin/cancel/{id}',
  tags: ['Orders (Admin)'],
  summary: 'Hủy đơn hàng (Admin)',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})

registry.registerPath({
  method: 'get',
  path: '/V1/orders/admin/logs/{id}',
  tags: ['Orders (Admin)'],
  summary: 'Xem lịch sử cập nhật đơn hàng',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK' } }
})
