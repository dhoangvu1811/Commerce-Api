import { registry } from '../openApiRegistry.js'
import { createProductSchema, updateProductSchema } from '~/validations/productValidation.js'
import { createApiResponseSchema, errorResponseSchema } from '../utils.js'
import { z } from 'zod'

// Định nghĩa response mẫu cho danh sách product
const productResponseSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: 'Sản phẩm mẫu' }),
  price: z.number().openapi({ example: 1000000 }),
  categoryId: z.number().openapi({ example: 1 }),
  image: z.string().openapi({ example: 'https://example.com/image.jpg' })
}).openapi({ description: 'Thông tin sản phẩm cơ bản' })

const getAllProductsResponse = z.object({
  products: z.array(productResponseSchema),
  totalProducts: z.number().openapi({ example: 100 }),
  totalPages: z.number().openapi({ example: 10 }),
  currentPage: z.number().openapi({ example: 1 })
})

// === Get All Products ===
registry.registerPath({
  method: 'get',
  path: '/V1/products/getAll',
  tags: ['Products'],
  summary: 'Lấy danh sách sản phẩm',
  description: 'API public lấy danh sách sản phẩm (có phân trang, lọc, tìm kiếm)',
  request: {
    query: z.object({
      page: z.string().optional().openapi({ example: '1' }),
      itemsPerPage: z.string().optional().openapi({ example: '10' }),
      search: z.string().optional().openapi({ description: 'Từ khóa tìm kiếm' }),
      categoryId: z.string().optional().openapi({ description: 'Lọc theo ID danh mục' })
    })
  },
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(getAllProductsResponse, 'Lấy danh sách sản phẩm thành công') } }
    }
  }
})

// === Get Product Details ===
registry.registerPath({
  method: 'get',
  path: '/V1/products/details/{identifier}',
  tags: ['Products'],
  summary: 'Lấy chi tiết sản phẩm',
  description: 'Hỗ trợ lấy theo ID hoặc slug',
  request: {
    params: z.object({
      identifier: z.string().openapi({ example: 'laptop-gaming-xyz', description: 'ID hoặc slug của sản phẩm' })
    })
  },
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(productResponseSchema, 'Lấy chi tiết sản phẩm thành công') } }
    },
    404: {
      description: 'Không tìm thấy sản phẩm',
      content: { 'application/json': { schema: errorResponseSchema('Sản phẩm không tồn tại', 404) } }
    }
  }
})

// === Get Similar Products (Recommendation Proxy) ===
registry.registerPath({
  method: 'get',
  path: '/V1/products/similar/{id}',
  tags: ['Products', 'AI Recommendations'],
  summary: 'Lấy sản phẩm tương tự',
  description: 'Gợi ý sản phẩm tương tự thông qua ecommerce-recommendation service. Hỗ trợ cá nhân hóa nếu gửi kèm JWT.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: '123' })
    }),
    query: z.object({
      topK: z.string().optional().openapi({ example: '8' }),
      mode: z.string().optional().openapi({ example: 'auto', description: 'auto | guest | personalized' })
    })
  },
  responses: {
    200: {
      description: 'Thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Gợi ý sản phẩm thành công') } }
    }
  }
})

// === Create Product (Admin) ===
registry.registerPath({
  method: 'post',
  path: '/V1/products/create',
  tags: ['Products (Admin)'],
  summary: 'Tạo sản phẩm mới',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: createProductSchema } }
    }
  },
  responses: {
    201: {
      description: 'Tạo thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Tạo sản phẩm thành công', 201) } }
    }
  }
})

// === Update Product (Admin) ===
registry.registerPath({
  method: 'put',
  path: '/V1/products/update/{id}',
  tags: ['Products (Admin)'],
  summary: 'Cập nhật sản phẩm',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { 'application/json': { schema: updateProductSchema } }
    }
  },
  responses: {
    200: {
      description: 'Cập nhật thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Cập nhật thành công') } }
    }
  }
})

// === Delete Product (Admin) ===
registry.registerPath({
  method: 'delete',
  path: '/V1/products/delete/{id}',
  tags: ['Products (Admin)'],
  summary: 'Xóa sản phẩm',
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

// === Delete Selected Products (Admin) ===
registry.registerPath({
  method: 'post',
  path: '/V1/products/deleteSelected',
  tags: ['Products (Admin)'],
  summary: 'Xóa nhiều sản phẩm',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: z.object({ productIds: z.array(z.string().or(z.number())) }) } }
    }
  },
  responses: {
    200: {
      description: 'Xóa thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Xóa thành công') } }
    }
  }
})

// === Upload Image (Admin) ===
registry.registerPath({
  method: 'post',
  path: '/V1/products/upload-image',
  tags: ['Products (Admin)'],
  summary: 'Upload hình ảnh sản phẩm',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.string().openapi({ format: 'binary' })
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Upload thành công',
      content: { 'application/json': { schema: createApiResponseSchema(z.any(), 'Upload thành công') } }
    }
  }
})
