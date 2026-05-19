import { registry } from '../openApiRegistry.js'
import { createApiResponseSchema, errorResponseSchema } from '../utils.js'
import { z } from 'zod'

registry.registerPath({
  method: 'post',
  path: '/V1/ai-chat',
  tags: ['AI Chatbot'],
  summary: 'Gửi tin nhắn cho AI Chatbot',
  description: 'Endpoint proxy gọi sang n8n RAG workflow và ecommerce-embeddings. Hỗ trợ upload ảnh bằng multipart/form-data',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            message: z.string().openapi({ description: 'Nội dung tin nhắn', example: 'Cho tôi xem laptop gaming dưới 30 củ' }),
            conversationId: z.string().optional().openapi({ description: 'ID phiên chat để giữ ngữ cảnh' }),
            productId: z.string().optional().openapi({ description: 'ID sản phẩm nếu chat trong trang chi tiết' }),
            locale: z.string().optional().openapi({ description: 'Ngôn ngữ: vi hoặc en', example: 'vi' }),
            image: z.string().openapi({ format: 'binary', description: 'Hình ảnh tìm kiếm' }).optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Thành công',
      content: {
        'application/json': {
          schema: createApiResponseSchema(
            z.object({
              reply: z.string().openapi({ example: 'Dạ với giá dưới 30 triệu, bạn có thể tham khảo dòng Acer Nitro...' }),
              sources: z.array(z.any()).optional()
            }),
            'OK'
          )
        }
      }
    },
    500: {
      description: 'Lỗi proxy AI',
      content: { 'application/json': { schema: errorResponseSchema('Internal Server Error', 500) } }
    }
  }
})
