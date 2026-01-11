/**
 * Product type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps, PaginationInfo } from './common.types.js'

/**
 * Product document trong MongoDB
 */
export interface Product extends Timestamps {
  _id?: ObjectId
  name: string
  image: string
  type: string
  countInStock: number
  price: number
  rating: number
  description: string
  selled: number
  discount: number
}

/**
 * Input tạo product mới
 */
export interface CreateProductInput {
  name: string
  image: string
  type: string
  countInStock: number
  price: number
  description?: string
  discount?: number
}

/**
 * Input cập nhật product
 */
export interface UpdateProductInput {
  name?: string
  image?: string
  type?: string
  countInStock?: number
  price?: number
  description?: string
  discount?: number
  rating?: number
  selled?: number
}

/**
 * Kết quả lấy danh sách products
 */
export interface GetProductsResult {
  products: Product[]
  pagination: PaginationInfo & {
    totalProducts: number
  }
}

/**
 * Product filter options
 */
export interface ProductFilter {
  type?: string
  name?: { $regex: string | RegExp; $options?: string }
  price?: { $gte?: number; $lte?: number }
  rating?: { $gte?: number }
  countInStock?: { $gt?: number }
}

/**
 * Product query filter cho service
 */
export interface ProductQueryFilter {
  search?: string
  type?: string
  sort?: string
}

/**
 * MongoDB filter for products
 */
export interface ProductMongoFilter {
  name?: { $regex: string; $options: string }
  type?: string
}

/**
 * Paginated products model result (generic)
 */
export interface PaginatedProductsModelResult<T = Product> {
  products: T[]
  pagination: PaginationInfo & {
    totalProducts: number
  }
}
