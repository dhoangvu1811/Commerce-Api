/**
 * Product Model - Prisma Version
 * Quản lý dữ liệu sản phẩm
 */

import { prisma } from '~/config/prisma.js'
import type { Product, Prisma, DecimalType as Decimal } from '@prisma/client'

/** Product type export từ Prisma */
export type { Product }

/** Paginated result cho products */
export interface PaginatedProductsResult {
  products: Product[]
  pagination: {
    page: number
    itemsPerPage: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/** Input tạo product mới */
export interface CreateProductInput {
  name: string
  slug: string
  categoryId: number
  image?: string
  description?: string
  price: number | Decimal
  stock?: number
  rating?: number | Decimal
  selled?: number
  discount?: number | Decimal
  status?: string
}

/** Input cập nhật product */
export interface UpdateProductInput {
  name?: string
  slug?: string
  categoryId?: number
  image?: string
  description?: string
  price?: number | Decimal
  stock?: number
  rating?: number | Decimal
  selled?: number
  discount?: number | Decimal
  status?: string
}

/** Filter cho getMany */
export interface ProductFilter {
  search?: string
  categoryId?: number
  status?: string
  minPrice?: number
  maxPrice?: number
}

/**
 * Tạo product mới
 */
const createNew = async (data: CreateProductInput): Promise<Product> => {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      categoryId: data.categoryId,
      image: data.image || null,
      description: data.description || null,
      price: data.price,
      stock: data.stock ?? 0,
      rating: data.rating ?? 0,
      selled: data.selled ?? 0,
      discount: data.discount ?? 0,
      status: data.status || 'active'
    },
    include: { category: true, images: true }
  })

  return product
}

/**
 * Tìm product theo ID
 */
const findOneById = async (productId: number): Promise<Product | null> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, images: true }
  })

  return product
}

/**
 * Tìm product theo slug
 */
const findBySlug = async (slug: string): Promise<Product | null> => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true, images: true }
  })

  return product
}

/**
 * Tìm product theo tên và categoryId (để check duplicate)
 */
const findByNameAndCategory = async (name: string, categoryId: number): Promise<Product | null> => {
  const product = await prisma.product.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      categoryId
    },
    include: { category: true, images: true }
  })

  return product
}

/**
 * Tìm nhiều products theo danh sách IDs
 */
const findByIds = async (productIds: number[]): Promise<Product[]> => {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true, images: true }
  })

  return products
}

/**
 * Lấy danh sách products với phân trang
 */
const getMany = async (
  filter: ProductFilter = {},
  page: number = 1,
  itemsPerPage: number = 10,
  orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }
): Promise<PaginatedProductsResult> => {
  const skip = (page - 1) * itemsPerPage

  // Build where clause
  const where: Prisma.ProductWhereInput = {}

  if (filter.search) {
    where.OR = [
      { name: { contains: filter.search, mode: 'insensitive' } },
      { description: { contains: filter.search, mode: 'insensitive' } }
    ]
  }
  if (filter.categoryId !== undefined) {
    where.categoryId = filter.categoryId
  }
  if (filter.status) {
    where.status = filter.status
  }

  // Filter by price range
  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    where.price = {}
    if (filter.minPrice !== undefined) {
      where.price.gte = filter.minPrice
    }
    if (filter.maxPrice !== undefined) {
      where.price.lte = filter.maxPrice
    }
  }

  const [products, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: itemsPerPage,
      include: { category: true, images: true }
    }),
    prisma.product.count({ where })
  ])

  const totalPages = Math.ceil(totalProducts / itemsPerPage)

  return {
    products,
    pagination: {
      page,
      itemsPerPage,
      totalItems: totalProducts,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Cập nhật thông tin product
 */
const update = async (productId: number, updateData: UpdateProductInput): Promise<Product | null> => {
  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { category: true, images: true }
    })

    return product
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Product không tồn tại
    }
    // Re-throw other errors (validation, constraint violations, etc.)
    throw error
  }
}

/**
 * Xóa product theo ID
 */
const deleteOneById = async (productId: number): Promise<Product | null> => {
  try {
    const product = await prisma.product.delete({
      where: { id: productId },
      include: { category: true, images: true }
    })

    return product
  } catch (error) {
    // P2025 = Record not found (Prisma error code)
    if ((error as { code?: string }).code === 'P2025') {
      return null // Product không tồn tại
    }
    // Re-throw other errors (constraint violations, etc.)
    throw error
  }
}

/**
 * Xóa nhiều products theo filter
 * Safety: Yêu cầu ít nhất một điều kiện để tránh xóa nhầm tất cả products
 */
const deleteMany = async (where: Prisma.ProductWhereInput = {}): Promise<{ count: number }> => {
  // Safety check: Không cho phép xóa tất cả products nếu filter rỗng hoặc không có điều kiện thực sự
  const whereKeys = Object.keys(where)
  const hasCondition =
    whereKeys.length > 0 &&
    (where.id !== undefined ||
      where.slug !== undefined ||
      where.categoryId !== undefined ||
      where.status !== undefined ||
      where.OR !== undefined ||
      where.AND !== undefined ||
      where.NOT !== undefined)

  if (!hasCondition) {
    throw new Error(
      'Không thể xóa tất cả products. Vui lòng cung cấp ít nhất một điều kiện filter (id, slug, categoryId, status, OR, AND, hoặc NOT).'
    )
  }

  const result = await prisma.product.deleteMany({ where })

  return { count: result.count }
}

/**
 * Giảm tồn kho atomically nếu đủ hàng
 * Sử dụng atomic update với condition stock >= qty
 * @param tx Optional transaction client để sử dụng trong transaction
 */
const decrementStock = async (
  productId: number,
  qty: number,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; modifiedCount: number }> => {
  const client = tx || prisma
  try {
    // Prisma không hỗ trợ conditional atomic update trực tiếp
    // Sử dụng raw query hoặc transaction
    const result = await client.$executeRaw`
      UPDATE products 
      SET stock = stock - ${qty}, updated_at = NOW()
      WHERE id = ${productId} AND stock >= ${qty}
    `

    return { success: result > 0, modifiedCount: result }
  } catch (error) {
    // Log error for debugging
    console.error('Error in decrementStock:', error)

    return { success: false, modifiedCount: 0 }
  }
}

/**
 * Tăng tồn kho (dùng cho rollback khi thất bại)
 * @param tx Optional transaction client để sử dụng trong transaction
 */
const incrementStock = async (
  productId: number,
  qty: number,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; modifiedCount: number }> => {
  const client = tx || prisma
  try {
    const result = await client.$executeRaw`
      UPDATE products 
      SET stock = stock + ${qty}, updated_at = NOW()
      WHERE id = ${productId}
    `

    return { success: result > 0, modifiedCount: result }
  } catch (error) {
    // Log error for debugging
    console.error('Error in incrementStock:', error)

    return { success: false, modifiedCount: 0 }
  }
}

/**
 * Tăng số lượng đã bán
 * @param tx Optional transaction client để sử dụng trong transaction
 */
const incrementSelled = async (
  productId: number,
  qty: number,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; modifiedCount: number }> => {
  const client = tx || prisma
  try {
    const result = await client.$executeRaw`
      UPDATE products 
      SET selled = selled + ${qty}, updated_at = NOW()
      WHERE id = ${productId}
    `

    return { success: result > 0, modifiedCount: result }
  } catch (error) {
    // Log error for debugging
    console.error('Error in incrementSelled:', error)

    return { success: false, modifiedCount: 0 }
  }
}

/**
 * Giảm số lượng đã bán (dùng khi hủy đơn đã thanh toán)
 * @param tx Optional transaction client để sử dụng trong transaction
 */
const decrementSelled = async (
  productId: number,
  qty: number,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; modifiedCount: number }> => {
  const client = tx || prisma
  try {
    // Giảm selled nhưng không để âm
    const result = await client.$executeRaw`
      UPDATE products 
      SET selled = GREATEST(0, selled - ${qty}), updated_at = NOW()
      WHERE id = ${productId}
    `

    return { success: result > 0, modifiedCount: result }
  } catch (error) {
    // Log error for debugging
    console.error('Error in decrementSelled:', error)

    return { success: false, modifiedCount: 0 }
  }
}

// PRODUCT IMAGES MANAGEMENT
// ============================================================

/**
 * Thêm nhiều ảnh gallery cho product
 */
const addImages = async (productId: number, imageUrls: string[]): Promise<{ count: number }> => {
  if (!imageUrls || imageUrls.length === 0) {
    return { count: 0 }
  }

  const result = await prisma.productImage.createMany({
    data: imageUrls.map(url => ({
      productId,
      image: url
    }))
  })

  return { count: result.count }
}

/**
 * Sync (thay thế toàn bộ) ảnh gallery cho product
 * Strategy: Xóa tất cả ảnh cũ và thêm ảnh mới
 */
const syncImages = async (
  productId: number,
  imageUrls: string[]
): Promise<{ deletedCount: number; addedCount: number }> => {
  // Xóa tất cả ảnh cũ
  const deleteResult = await prisma.productImage.deleteMany({
    where: { productId }
  })

  // Thêm ảnh mới (nếu có)
  let addedCount = 0
  if (imageUrls && imageUrls.length > 0) {
    const addResult = await prisma.productImage.createMany({
      data: imageUrls.map(url => ({
        productId,
        image: url
      }))
    })
    addedCount = addResult.count
  }

  return {
    deletedCount: deleteResult.count,
    addedCount
  }
}

/**
 * Xóa tất cả ảnh gallery của product
 */
const deleteImagesByProductId = async (productId: number): Promise<{ count: number }> => {
  const result = await prisma.productImage.deleteMany({
    where: { productId }
  })

  return { count: result.count }
}

/**
 * Xóa một ảnh gallery cụ thể
 */
const deleteImageById = async (imageId: number): Promise<boolean> => {
  try {
    await prisma.productImage.delete({
      where: { id: imageId }
    })

    return true
  } catch {
    return false
  }
}

export const productModel = {
  createNew,
  findOneById,
  findBySlug,
  findByNameAndCategory,
  findByIds,
  getMany,
  update,
  deleteOneById,
  deleteMany,
  decrementStock,
  incrementStock,
  incrementSelled,
  decrementSelled,
  // Product Images
  addImages,
  syncImages,
  deleteImagesByProductId,
  deleteImageById
}
