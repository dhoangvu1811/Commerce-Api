/**
 * Product type definitions
 */

import type { ObjectId } from 'mongodb'
import type { Timestamps } from './common.types.js'

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
  pagination: {
    page: number
    itemsPerPage: number
    totalProducts: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/**
 * Product filter options
 */
export interface ProductFilter {
  type?: string
  name?: { $regex: RegExp }
  price?: { $gte?: number; $lte?: number }
  rating?: { $gte?: number }
  countInStock?: { $gt?: number }
}
