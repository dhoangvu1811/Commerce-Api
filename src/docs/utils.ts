import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

// Đảm bảo Zod được extend với OpenAPI
extendZodWithOpenApi(z)

export const createApiResponseSchema = (dataSchema: z.ZodTypeAny | null, message: string = 'Success', code: number = 200) => {
  return z.object({
    code: z.number().openapi({ example: code }),
    message: z.string().openapi({ example: message }),
    data: dataSchema ? dataSchema : z.null().openapi({ example: null })
  })
}

export const errorResponseSchema = (message: string, code: number = 400) => {
  return z.object({
    code: z.number().openapi({ example: code }),
    message: z.string().openapi({ example: message })
  })
}
