/**
 * Prisma Client Configuration
 * Singleton pattern để quản lý kết nối PostgreSQL
 */

import { PrismaClient } from '../generated/prisma/index.js'

// Tạo singleton instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.BUILD_MODE === 'dev'
        ? ['query', 'info', 'warn', 'error']
        : ['error']
  })

if (process.env.BUILD_MODE !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Kết nối tới PostgreSQL
 * Sử dụng khi cần explicit connection
 */
export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect()
    console.log('✅ PostgreSQL connected successfully')
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error)
    throw error
  }
}

/**
 * Đóng kết nối PostgreSQL
 * Dùng khi shutdown gracefully
 */
export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect()
  console.log('PostgreSQL disconnected')
}

export default prisma
