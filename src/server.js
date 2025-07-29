/* eslint-disable no-console */
import express from 'express'
import { CLOSE_DB, CONNECT_DB } from './config/mongodb'

const START_SERVER = () => {
  const app = express()

  app.get('/', (req, res) => {
    res.send('Hello World from Commerce API')
  })

  const server = app.listen({ port: 8017 }, () => {
    console.log('3. Server is running on http://localhost:8017')
  })

  // Graceful shutdown function
  const gracefulShutdown = async (signal) => {
    console.log(`4. Server is shutting down... (${signal})`)
    try {
      // Close HTTP server
      server.close(() => {
        console.log('HTTP server closed.')
      })
      
      // Close database connection
      await CLOSE_DB()
      console.log('5. Disconnected from MongoDB Cloud Atlas!')
      process.exit(0)
    } catch (error) {
      console.error('Error during graceful shutdown:', error)
      process.exit(1)
    }
  }

  // Handle các signals để shutdown gracefully
  process.on('SIGINT', () => gracefulShutdown('SIGINT')) // Ctrl+C
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM')) // Kill command
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')) // Nodemon restart
}

//Chỉ khi kết nối thành công mới start server
//Immediately Invoked / Anonymous Async Functions (IIFE)
;(async () => {
  try {
    console.log('1. Connecting to MongoDB Cloud Atlas...')
    await CONNECT_DB()
    console.log('2. Connected to MongoDB Cloud Atlas!')
    START_SERVER()
  } catch (error) {
    console.error(error)
    process.exit(0)
  }
})()
