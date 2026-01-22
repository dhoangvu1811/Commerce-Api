import { StatusCodes } from 'http-status-codes'
import { categoryModel, type Category } from '~/models/categoryModel.js'
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryFilter
} from '~/types/category.types.js'
import ApiError from '~/utils/ApiError.js'
import { slugify } from '~/utils/helper.js'

/**
 * Create new category
 */
const createNew = async (data: CreateCategoryInput): Promise<Category> => {
  // Generate slug from name
  let slug = slugify(data.name)

  // Check if slug exists
  const existingCategory = await categoryModel.findBySlug(slug)

  // If slug exists, append timestamp
  if (existingCategory) {
    slug = `${slug}-${Date.now()}`
  }

  const category = await categoryModel.create({
    ...data,
    slug
  })

  return category
}

/**
 * Get all categories
 */
const getAll = async (filter: CategoryFilter = {}): Promise<Category[]> => {
  const categories = await categoryModel.findAll(filter)
  return categories
}

/**
 * Get category details by ID
 */
const getDetail = async (categoryId: number): Promise<Category> => {
  const category = await categoryModel.findById(categoryId)

  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tìm thấy')
  }

  return category
}

/**
 * Update category
 */
const update = async (
  categoryId: number,
  data: UpdateCategoryInput
): Promise<Category> => {
  const existingCategory = await categoryModel.findById(categoryId)

  if (!existingCategory) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Danh mục không tìm thấy')
  }

  let slug = existingCategory.slug
  if (data.name && data.name !== existingCategory.name) {
    slug = slugify(data.name)
    const existingSlug = await categoryModel.findBySlug(slug)
    if (existingSlug && existingSlug.id !== categoryId) {
      slug = `${slug}-${Date.now()}`
    }
  }

  const updatedCategory = await categoryModel.update(categoryId, {
    ...data,
    slug
  })

  return updatedCategory
}

/**
 * Delete category
 * Prevent deletion if it has products
 */
const deleteCategory = async (categoryId: number): Promise<boolean> => {
  // Check if category has products
  const productsCount = await categoryModel.countProducts(categoryId)

  if (productsCount > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Không thể xóa danh mục này vì đang có sản phẩm liên kết. Vui lòng xóa hoặc di chuyển sản phẩm trước.'
    )
  }

  await categoryModel.deleteById(categoryId)

  return true
}

/**
 * Delete multiple categories
 * Prevent deletion if any has products
 */
const deleteMany = async (
  categoryIds: number[]
): Promise<{ count: number }> => {
  // Check if any category has products
  const productsCount =
    await categoryModel.countProductsInCategories(categoryIds)

  if (productsCount > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Không thể xóa các danh mục đã chọn vì có chứa sản phẩm. Vui lòng xóa hoặc di chuyển sản phẩm trước.'
    )
  }

  return await categoryModel.deleteMany(categoryIds)
}

export const categoryService = {
  createNew,
  getAll,
  getDetail,
  update,
  deleteCategory,
  deleteMany
}
