import { registry } from '../openApiRegistry.js'
import { createApiResponseSchema } from '../utils.js'
import { z } from 'zod'

registry.registerPath({
  method: 'get',
  path: '/V1/categories',
  tags: ['Categories'],
  summary: 'Lấy danh sách danh mục',
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Lấy danh mục thành công') } }
    }
  }
})

registry.registerPath({
  method: 'get',
  path: '/V1/categories/{id}',
  tags: ['Categories'],
  summary: 'Chi tiết danh mục',
  request: {
    params: z.object({ id: z.string().openapi({ example: '1' }) })
  },
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Chi tiết danh mục thành công') } }
    }
  }
})

// === Create Category (Admin) ===
registry.registerPath({
  method: 'post',
  path: '/V1/categories',
  tags: ['Categories (Admin)'],
  summary: 'Tạo danh mục mới',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            name: z.string().openapi({ example: 'Laptop Gaming' }),
            description: z.string().optional().openapi({ example: 'Các dòng laptop hiệu năng cao' }),
            image: z.string().openapi({ format: 'binary' }).optional()
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Tạo danh mục thành công', 201) } }
    }
  }
})

// === Update Category (Admin) ===
registry.registerPath({
  method: 'put',
  path: '/V1/categories/{id}',
  tags: ['Categories (Admin)'],
  summary: 'Cập nhật danh mục',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            name: z.string().optional().openapi({ example: 'Laptop Gaming Updated' }),
            description: z.string().optional().openapi({ example: 'Update text' }),
            image: z.string().openapi({ format: 'binary' }).optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Cập nhật thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Cập nhật thành công') } }
    }
  }
})

// === Delete Category (Admin) ===
registry.registerPath({
  method: 'delete',
  path: '/V1/categories/{id}',
  tags: ['Categories (Admin)'],
  summary: 'Xóa danh mục',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() })
  },
  responses: {
    200: {
      description: 'Xóa thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Xóa thành công') } }
    }
  }
})

// === Delete Many Categories (Admin) ===
registry.registerPath({
  method: 'delete',
  path: '/V1/categories/delete-many',
  tags: ['Categories (Admin)'],
  summary: 'Xóa nhiều danh mục',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: z.object({ categoryIds: z.array(z.string().or(z.number())) }) } }
    }
  },
  responses: {
    200: {
      description: 'Xóa thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Xóa thành công') } }
    }
  }
})
