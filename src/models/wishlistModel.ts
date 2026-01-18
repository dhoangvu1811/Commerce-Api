/**
 * Wishlist Model
 * Quản lý danh sách yêu thích
 */

import { prisma } from '~/config/prisma.js'
import type { Wishlist } from '~/generated/prisma/index.js'

export type { Wishlist }

/**
 * Check if product is in wishlist
 */
const checkExist = async (
  userId: number,
  productId: number
): Promise<Wishlist | null> => {
  return await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })
}

/**
 * Add to wishlist
 */
const add = async (userId: number, productId: number): Promise<Wishlist> => {
  return await prisma.wishlist.create({
    data: {
      userId,
      productId
    }
  })
}

/**
 * Remove from wishlist
 */
const remove = async (userId: number, productId: number): Promise<Wishlist> => {
  return await prisma.wishlist.delete({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })
}

/**
 * Get wishlist items
 */
const getByUserId = async (userId: number) => {
  return await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          price: true,
          discount: true,
          rating: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Đếm số lượng sản phẩm trong wishlist
 */
const countByUserId = async (userId: number): Promise<number> => {
  return await prisma.wishlist.count({
    where: { userId }
  })
}

export const wishlistModel = {
  checkExist,
  add,
  remove,
  getByUserId,
  countByUserId
}
