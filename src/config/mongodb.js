import { MongoClient, ServerApiVersion } from 'mongodb'
import { env } from '~/config/environment'

let commerceapiDatabaseInstance = null

//Khởi tạo một đối tượng mongoClientInstance để connect tới MongoDB
const mongoClientInstance = new MongoClient(env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false, // Cho phép sử dụng các command không có trong API v1
    deprecationErrors: true
  }
})

// Kết nối tới Database
export const CONNECT_DB = async () => {
  await mongoClientInstance.connect()

  commerceapiDatabaseInstance = mongoClientInstance.db(env.DATABASE_NAME)
}

//Hàm GET_DB export commerceapiDatabaseInstance sau khi kết nối thành công để sử dụng ở nhiều nơi khác nhau
export const GET_DB = () => {
  if (!commerceapiDatabaseInstance)
    throw new Error('Must connect to Database first!')
  return commerceapiDatabaseInstance
}

export const CLOSE_DB = async () => {
  await mongoClientInstance.close()
}
