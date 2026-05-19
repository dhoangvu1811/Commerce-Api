/**
 * Server Entry Point
 * Điểm khởi động chính của ứng dụng Express
 */

/* eslint-disable no-console */
import 'dotenv/config'
import http from 'http'
import cookieParser from 'cookie-parser'
import type { Request, Response, NextFunction } from 'express'
import express from 'express'
import errorHandlingMiddleware from './middlewares/errorHandlingMiddleware.js'
import { env } from './config/environment.js'
import { APIs_V1 } from './routes/V1/index.js'
import { connectDB, disconnectDB } from './config/prisma.js'
import cors from 'cors'
import { corsOptions } from './config/cors.js'
import { initSocket } from './config/socket.js'
import '~/providers/passport.js'

/**
 * Khởi động Express server
 */
const START_SERVER = (): void => {
  const app = express()

  // Fix cái vụ Cache from disk của ExpressJS
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // Cấu hình Cookie parser
  app.use(cookieParser())

  // Xử lý cors
  app.use(cors(corsOptions))

  // Enable req.body json data
  app.use(express.json())

  // Swagger API Docs (Mở public ở dev, có Basic Auth ở production)
  import('swagger-ui-express').then(swaggerUi => {
    import('./docs/swagger.js').then(({ generateOpenApiDocument }) => {
      import('express-basic-auth').then(basicAuthModule => {
        const basicAuth = basicAuthModule.default
        const swaggerMiddleware = [swaggerUi.default.serve, swaggerUi.default.setup(generateOpenApiDocument())]
        
        if (env.BUILD_MODE === 'production') {
          app.use(
            '/api-docs',
            basicAuth({
              users: { 'admin': '123456' },
              challenge: true,
              realm: 'API Docs'
            }),
            ...swaggerMiddleware
          )
        } else {
          app.use('/api-docs', ...swaggerMiddleware)
        }
      })
    })
  })

  // Use APIs V1
  app.use('/V1', APIs_V1)

  // Middleware xử lý lỗi tập trung
  app.use(errorHandlingMiddleware)

  // Tạo HTTP server và khởi tạo Socket.IO
  const httpServer = http.createServer(app)
  initSocket(httpServer)

  // Môi trường production
  console.log('🚀 ~ START_SERVER ~ env.BUILD_MODE:', env.BUILD_MODE)
  if (env.BUILD_MODE === 'production') {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
    httpServer.listen(port, () => {
      console.log(
        `3. PRODUCTION Hello ${env.AUTHOR}, I am running at PORT: ${port}`
      )
    })
  } else {
    // Môi trường Local dev
    httpServer.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
      console.log(
        `3. LOCAL_DEV Hello ${env.AUTHOR}, I am running at HOST: ${env.LOCAL_DEV_APP_HOST} and PORT: ${env.LOCAL_DEV_APP_PORT}`
      )
    })
  }

  /**
   * Graceful shutdown function
   * Đóng kết nối database trước khi tắt server
   */
  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`4. Server is shutting down... (${signal})`)
    try {
      await disconnectDB()
      console.log('5. Disconnected from PostgreSQL!')
      process.exit(0)
    } catch (error) {
      console.error('Error closing database:', error)
      process.exit(1)
    }
  }

  // Handle các signals để shutdown gracefully
  process.on('SIGINT', () => gracefulShutdown('SIGINT')) // Ctrl+C
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM')) // Kill command
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')) // Nodemon restart
}

/**
 * Chỉ khi kết nối thành công mới start server
 * Immediately Invoked / Anonymous Async Functions (IIFE)
 */
;(async (): Promise<void> => {
  try {
    console.log('1. Connecting to PostgreSQL...')
    await connectDB()
    console.log('2. Connected to PostgreSQL!')
    START_SERVER()
  } catch (error) {
    console.error(error)
    process.exit(0)
  }
})()
