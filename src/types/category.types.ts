import { PaginationInfo } from './common.types.js'

export interface Category {
  id: number
  name: string
  slug: string
  description?: string | null
  image?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateCategoryInput {
  name: string
  description?: string | null
  image?: string | null
}

export interface UpdateCategoryInput {
  name?: string
  description?: string | null
  image?: string | null
}

export interface CategoryFilter {
  search?: string
}

export interface PaginatedCategoriesResult {
  categories: Category[]
  pagination: PaginationInfo
}
