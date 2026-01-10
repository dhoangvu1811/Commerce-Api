/**
 * MongoDB Connection Configuration
 * Quản lý kết nối MongoDB sử dụng Native Driver
 */

import { MongoClient } from 'mongodb'
import type { Db } from 'mongodb'
import { env } from '~/config/environment.js'

// Khởi tạo đối tượng mongoClientInstance ban đầu là null
let mongoClientInstance: MongoClient | null = null

/**
 * Kết nối MongoDB Database
 * @returns {Promise<MongoClient>} MongoDB Client instance
 */
export const CONNECT_DB = async (): Promise<MongoClient> => {
  // Gọi kết nối MongoDB với URI đã khai báo trong file environment
  mongoClientInstance = new MongoClient(env.MONGODB_URI)

  // Kết nối tới Database
  await mongoClientInstance.connect()

  // Kết nối thành công thì trả về mongoClientInstance
  return mongoClientInstance
}

/**
 * Lấy Database instance từ mongoClientInstance
 * Đảm bảo chỉ gọi sau khi đã kết nối thành công tới MongoDB
 * @returns {Db} MongoDB Database instance
 * @throws {Error} Nếu chưa kết nối MongoDB
 */
export const GET_DB = (): Db => {
  if (!mongoClientInstance) {
    throw new Error('MongoDB chưa được kết nối. Vui lòng gọi CONNECT_DB trước.')
  }
  return mongoClientInstance.db(env.DATABASE_NAME)
}

/**
 * Lấy MongoClient instance
 * @returns {MongoClient | null} MongoDB Client instance hoặc null
 */
export const GET_CLIENT = (): MongoClient | null => {
  return mongoClientInstance
}

/**
 * Đóng kết nối MongoDB
 * Dùng khi cần cleanup hoặc shutdown gracefully
 * @returns {Promise<void>}
 */
export const CLOSE_DB = async (): Promise<void> => {
  if (mongoClientInstance) {
    await mongoClientInstance.close()
    mongoClientInstance = null
  }
}
