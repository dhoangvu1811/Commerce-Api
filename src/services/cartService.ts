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
const addToCart = async (userId: number, productId: number, quantity: number) => {
  // 1. Check Product exists & active
  const product = await productModel.findOneById(productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }
  if (product.status !== 'active') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm hiện không khả dụng')
  }

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
const updateCartItem = async (userId: number, productId: number, quantity: number) => {
  // 1. Check Product exists & active
  const product = await productModel.findOneById(productId)
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại')
  }
  if (product.status !== 'active') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Sản phẩm hiện không khả dụng')
  }

  // 2. Check Stock
  if (quantity > product.stock) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Số lượng trong kho không đủ (Còn lại: ${product.stock})`)
  }

  // 3. Check item exist in cart
  const existingItem = await cartModel.findItem(userId, productId)
  if (!existingItem) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không có trong giỏ hàng')
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
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không có trong giỏ hàng')
  }

  return await cartModel.removeItem(userId, productId)
}

/**
 * Get Cart
 */
const getMyCart = async (userId: number) => {
  const items = await cartModel.getCartByUserId(userId)

  // Lọc bỏ sản phẩm inactive hoặc hết hàng (stock = 0) — chỉ hiển thị, không xóa khỏi DB
  const activeItems = items.filter(item => item.product.status === 'active')

  // Calculate total price locally (chỉ tính trên sản phẩm active)
  const totalPrice = activeItems.reduce((sum, item) => {
    // Giá tính theo discount nếu có
    const price = Number(item.product.price)
    const discount = Number(item.product.discount) || 0
    const finalPrice = price * (1 - discount / 100)

    return sum + finalPrice * item.quantity
  }, 0)

  return {
    items: activeItems,
    totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
    totalItems: activeItems.length
  }
}

/**
 * Sync giỏ hàng khách vãng lai vào tài khoản sau khi đăng nhập
 * Logic: item đã tồn tại → CỘNG DỒN (serverQty + guestQty), nếu chưa → thêm mới
 *
 * Dùng ADD thay vì MAX vì:
 * - Guest cart chỉ chứa các item được thêm SAU KHI đăng xuất (không phải bản sao server)
 * - localStorage bị xóa ngay trước khi sync, đảm bảo không sync trùng lặp
 */
const syncCart = async (userId: number, items: { productId: number; quantity: number }[]) => {
  // Thu thập danh sách sản phẩm bị điều chỉnh số lượng do vượt tồn kho
  const adjustedItems: { productName: string; requestedQty: number; adjustedQty: number }[] = []

  for (const item of items) {
    // Kiểm tra sản phẩm tồn tại và đang active
    const product = await productModel.findOneById(item.productId)
    if (!product || product.status !== 'active') continue // Bỏ qua sản phẩm không tồn tại hoặc inactive

    const existing = await cartModel.findItem(userId, item.productId)

    if (existing) {
      // Cộng dồn số lượng guest vào server, giới hạn theo tồn kho
      const addedQty = existing.quantity + item.quantity
      const safeQty = Math.min(addedQty, product.stock)

      if (safeQty < addedQty) {
        adjustedItems.push({
          productName: product.name,
          requestedQty: addedQty,
          adjustedQty: safeQty
        })
      }

      await cartModel.updateQuantity(userId, item.productId, safeQty)
    } else {
      // Thêm mới, giới hạn theo tồn kho
      const safeQty = Math.min(item.quantity, product.stock)

      if (safeQty < item.quantity) {
        adjustedItems.push({
          productName: product.name,
          requestedQty: item.quantity,
          adjustedQty: safeQty
        })
      }

      if (safeQty > 0) {
        await cartModel.upsertItem({ userId, productId: item.productId, quantity: safeQty })
      }
    }
  }

  const cart = await getMyCart(userId)

  return { ...cart, adjustedItems }
}

/**
 * Xóa toàn bộ giỏ hàng
 */
const clearCart = async (userId: number) => {
  await cartModel.clearCart(userId)
}

export const cartService = {
  addToCart,
  updateCartItem,
  removeCartItem,
  getMyCart,
  syncCart,
  clearCart
}
