/**
 * Prisma Client Configuration - Prisma v7
 * Singleton pattern để quản lý kết nối PostgreSQL
 *
 * Prisma v7 requires either:
 * 1. accelerateUrl (for Prisma Accelerate)
 * 2. adapter (for direct database connection)
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Prisma } from '~/generated/prisma/index.js'
import { env } from './environment.js'

// Export Prisma types for use in models
export { Prisma }
export type { PrismaClient }

// Create PostgreSQL connection pool
const connectionString = env.DATABASE_URL

// Tạo singleton instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// Create pool if not exists (for singleton pattern)
const pool = globalForPrisma.pool ?? new Pool({ connectionString })

// Create Prisma adapter
const adapter = new PrismaPg(pool)

// Prisma v7: Use adapter for direct database connection
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.BUILD_MODE !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
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
  await pool.end()
  console.log('PostgreSQL disconnected')
}

export default prisma
