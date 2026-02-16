/**
 * Category Model
 * Quản lý dữ liệu Category
 */

import { prisma } from '~/config/prisma.js'
import type { Category } from '~/generated/prisma/index.js'
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryFilter,
  PaginatedCategoriesResult
} from '~/types/category.types.js'

/** Export type cho service sử dụng */
export type { Category }

/** Paginated result cho categories */

/**
 * Tìm tất cả categories
 */
const findAll = async (
  filter: CategoryFilter = {},
  page: number = 1,
  itemsPerPage: number = 100 // Default high limit for backward compatibility if needed, or stick to standard 10
): Promise<PaginatedCategoriesResult> => {
  const { search } = filter
  const where: any = {}

  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  const skip = (page - 1) * itemsPerPage

  const [categories, totalItems] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: itemsPerPage,
      include: {
        _count: {
          select: { products: true }
        }
      }
    }),
    prisma.category.count({ where })
  ])

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return {
    categories,
    pagination: {
      page,
      itemsPerPage,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Tìm category theo ID
 */
const findById = async (id: number): Promise<Category | null> => {
  return await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true }
      }
    }
  })
}

/**
 * Tìm category theo Slug
 */
const findBySlug = async (slug: string): Promise<Category | null> => {
  return await prisma.category.findUnique({
    where: { slug }
  })
}

/**
 * Tạo mới category
 */
const create = async (
  data: CreateCategoryInput & { slug: string }
): Promise<Category> => {
  return await prisma.category.create({
    data
  })
}

/**
 * Cập nhật category
 */
const update = async (
  id: number,
  data: UpdateCategoryInput & { slug?: string }
): Promise<Category> => {
  return await prisma.category.update({
    where: { id },
    data
  })
}

/**
 * Đếm số sản phẩm trong category
 */
const countProducts = async (categoryId: number): Promise<number> => {
  return await prisma.product.count({
    where: { categoryId }
  })
}

/**
 * Đếm số sản phẩm trong danh sách categories
 */
const countProductsInCategories = async (
  categoryIds: number[]
): Promise<number> => {
  return await prisma.product.count({
    where: { categoryId: { in: categoryIds } }
  })
}

/**
 * Xóa category
 */
const deleteById = async (id: number): Promise<Category> => {
  return await prisma.category.delete({
    where: { id }
  })
}

/**
 * Xóa nhiều category
 */
const deleteMany = async (ids: number[]): Promise<{ count: number }> => {
  return await prisma.category.deleteMany({
    where: { id: { in: ids } }
  })
}

export const categoryModel = {
  findAll,
  findById,
  findBySlug,
  create,
  update,
  countProducts,
  countProductsInCategories,
  deleteById,
  deleteMany
}
