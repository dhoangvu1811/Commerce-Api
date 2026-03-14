/**
 * Cart Model
 * Quản lý giỏ hàng (CartItem)
 */

import { prisma } from '~/config/prisma.js'
import type { CartItem } from '@prisma/client'

export type { CartItem }

export interface AddToCartInput {
  userId: number
  productId: number
  quantity: number
}

/**
 * Thêm sản phẩm vào giỏ hàng
 * Nếu đã có -> update quantity
 */
const upsertItem = async (data: AddToCartInput): Promise<CartItem> => {
  // Check if item exists
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: data.userId,
        productId: data.productId
      }
    }
  })

  if (existingItem) {
    // Update quantity
    return await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + data.quantity }
    })
  }

  // Create new
  return await prisma.cartItem.create({
    data: {
      userId: data.userId,
      productId: data.productId,
      quantity: data.quantity
    }
  })
}

/**
 * Cập nhật số lượng item
 */
const updateQuantity = async (
  userId: number,
  productId: number,
  quantity: number
): Promise<CartItem> => {
  return await prisma.cartItem.update({
    where: {
      userId_productId: {
        userId,
        productId
      }
    },
    data: { quantity }
  })
}

/**
 * Xóa item khỏi giỏ
 */
const removeItem = async (
  userId: number,
  productId: number
): Promise<CartItem> => {
  return await prisma.cartItem.delete({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })
}

/**
 * Xóa toàn bộ giỏ hàng của user
 */
const clearCart = async (userId: number): Promise<void> => {
  await prisma.cartItem.deleteMany({
    where: { userId }
  })
}

/**
 * Lấy giỏ hàng của user (kèm thông tin product)
 */
const getCartByUserId = async (userId: number) => {
  return await prisma.cartItem.findMany({
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
          stock: true,
          status: true
        }
      }
    },
    orderBy: { id: 'desc' }
  })
}

/**
 * Đếm số lượng items trong giỏ
 */
const countItems = async (userId: number): Promise<number> => {
  const result = await prisma.cartItem.aggregate({
    where: { userId },
    _sum: { quantity: true }
  })

  return result._sum.quantity || 0
}

/**
 * Find item specific
 */
const findItem = async (
  userId: number,
  productId: number
): Promise<CartItem | null> => {
  return await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId
      }
    }
  })
}

export const cartModel = {
  upsertItem,
  updateQuantity,
  removeItem,
  clearCart,
  getCartByUserId,
  countItems,
  findItem
}
