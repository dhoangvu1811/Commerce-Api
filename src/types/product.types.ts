/**
 * Product type definitions
 */

import type { Timestamps, PaginationInfo } from './common.types.js'

/**
 * Product entity (PostgreSQL/Prisma)
 * Note: _id is string for backward compatibility with API responses
 */
export interface Product extends Timestamps {
  _id?: string | number
  name: string
  image: string | null
  categoryId: number
  stock: number
  price: number
  rating: number
  description: string | null
  selled: number
  discount: number
  status?: string
}

/**
 * Input tạo product mới
 */
export interface CreateProductInput {
  name: string
  image: string
  categoryId: number
  stock: number
  price: number
  description?: string
  discount?: number
  status?: string
}

/**
 * Input cập nhật product
 */
export interface UpdateProductInput {
  name?: string
  image?: string
  categoryId?: number
  stock?: number
  price?: number
  description?: string
  discount?: number
  rating?: number
  selled?: number
  status?: string
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
  categoryId?: number
  name?: { $regex: string | RegExp; $options?: string }
  price?: { $gte?: number; $lte?: number }
  rating?: { $gte?: number }
  stock?: { $gt?: number }
}

/**
 * Product query filter cho service
 */
export interface ProductQueryFilter {
  search?: string
  categoryId?: number
  sort?: string
  minPrice?: number
  maxPrice?: number
}

/**
 * Product filter (legacy - kept for backward compatibility)
 * Note: Prisma uses different filter structure
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
