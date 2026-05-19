import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'
import { registry } from './openApiRegistry.js'
import { env } from '~/config/environment.js'

// --- Import các file paths ---
import './paths/userPaths.js'
import './paths/productPaths.js'
import './paths/aiChatPaths.js'
import './paths/cartPaths.js'
import './paths/orderPaths.js'
import './paths/categoryPaths.js'
import './paths/checkoutPaths.js'
import './paths/socialPaths.js'
import './paths/adminPaths.js'

export const generateOpenApiDocument = (): any => {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Commerce API',
      description: 'API documentation cho hệ thống E-commerce',
      contact: {
        name: env.AUTHOR
      }
    },
    servers: [
      { url: `http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}`, description: 'Local Development Server' },
      // Thêm Production Server sau nếu cần
    ]
  })
}
