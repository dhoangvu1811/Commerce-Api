/**
 * Cart Service
 * Logic xử lý giỏ hàng
 */

import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError.js'
import { cartModel } from '~/models/cartModel.js'
import { productModel } from '~/models/productModel.js'

/**
 * Thêm vào giỏ
 */
const addToCart = async (
  userId: number,
  productId: number,
  quantity: number
) => {
  // 1. Check Product exists & active
  const product = await productModel.findOneById(productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }
  // TODO: Check product status (active/inactive)

  // 2. Check current cart item to calculate total quantity
  const existingItem = await cartModel.findItem(userId, productId)
  const currentQuantity = existingItem ? existingItem.quantity : 0
  const totalQuantity = currentQuantity + quantity

  // 3. Check Stock
  if (totalQuantity > product.stock) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Số lượng trong kho không đủ (Còn lại: ${product.stock}, Trong giỏ: ${currentQuantity}, Muốn thêm: ${quantity})`
    )
  }

  // 4. Upsert
  return await cartModel.upsertItem({ userId, productId, quantity })
}

/**
 * Update số lượng
 */
const updateCartItem = async (
  userId: number,
  productId: number,
  quantity: number
) => {
  // 1. Check Product exists
  const product = await productModel.findOneById(productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }

  // 2. Check Stock
  if (quantity > product.stock) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Số lượng trong kho không đủ (Còn lại: ${product.stock})`
    )
  }

  // 3. Check item exist in cart
  const existingItem = await cartModel.findItem(userId, productId)
  if (!existingItem) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Sản phẩm không có trong giỏ hàng'
    )
  }

  return await cartModel.updateQuantity(userId, productId, quantity)
}

/**
 * Remove Item
 */
const removeCartItem = async (userId: number, productId: number) => {
  // Verify item exists
  const existingItem = await cartModel.findItem(userId, productId)
  if (!existingItem) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Sản phẩm không có trong giỏ hàng'
    )
  }
  return await cartModel.removeItem(userId, productId)
}

/**
 * Get Cart
 */
const getMyCart = async (userId: number) => {
  const items = await cartModel.getCartByUserId(userId)

  // Calculate total price locally
  const totalPrice = items.reduce((sum, item) => {
    // Giá tính theo discount nếu có
    const price = Number(item.product.price)
    const discount = Number(item.product.discount) || 0
    const finalPrice = price * (1 - discount / 100)

    return sum + finalPrice * item.quantity
  }, 0)

  return {
    items,
    totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
    totalItems: items.length
  }
}

export const cartService = {
  addToCart,
  updateCartItem,
  removeCartItem,
  getMyCart
}
