/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, test, expect, vi, afterEach } from 'vitest'
import { cartService } from '~/services/cartService.js'
import { cartModel } from '~/models/cartModel.js'
import { productModel } from '~/models/productModel.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const mockProduct = {
  id: 99,
  name: 'Test Product',
  price: 150000,
  discount: 10,
  stock: 5, // Tồn kho tối đa là 5
  status: 'active'
}

describe('cartService.syncCart (Deep Logic - Cart Merging & Stock Adjustments)', () => {
  test('CRT-SNC-HP-001 should merge guest items and update quantity without exceeding stock', async () => {
    // Arrange: Guest adds 2, Server already has 1. Max stock is 5.
    const guestItems = [{ productId: 99, quantity: 2 }]
    const existingServerItem = { id: 1, userId: 10, productId: 99, quantity: 1 }

    vi.spyOn(productModel, 'findOneById').mockResolvedValue(mockProduct as any)
    vi.spyOn(cartModel, 'findItem').mockResolvedValue(existingServerItem as any)
    vi.spyOn(cartModel, 'updateQuantity').mockResolvedValue(null as any)
    
    // getMyCart mock
    vi.spyOn(cartModel, 'getCartByUserId').mockResolvedValue([
      {
        id: 1,
        userId: 10,
        productId: 99,
        quantity: 3, // 1 + 2 = 3 (bé hơn stock 5)
        product: mockProduct
      }
    ] as any)

    // Act
    const result = await cartService.syncCart(10, guestItems)

    // Assert
    expect(cartModel.updateQuantity).toHaveBeenCalledWith(10, 99, 3)
    expect(result.adjustedItems.length).toBe(0)
    expect(result.totalItems).toBe(1)
    expect(result.totalPrice).toBe(405000) // 135k * 3
  })

  test('CRT-SNC-EG-001 should merge and adjust quantity down to stock limit', async () => {
    // Arrange: Guest adds 4, Server already has 2. Total is 6, exceeding stock limit of 5.
    const guestItems = [{ productId: 99, quantity: 4 }]
    const existingServerItem = { id: 1, userId: 10, productId: 99, quantity: 2 }

    vi.spyOn(productModel, 'findOneById').mockResolvedValue(mockProduct as any)
    vi.spyOn(cartModel, 'findItem').mockResolvedValue(existingServerItem as any)
    vi.spyOn(cartModel, 'updateQuantity').mockResolvedValue(null as any)

    vi.spyOn(cartModel, 'getCartByUserId').mockResolvedValue([
      {
        id: 1,
        userId: 10,
        productId: 99,
        quantity: 5, // Capped at stock = 5
        product: mockProduct
      }
    ] as any)

    // Act
    const result = await cartService.syncCart(10, guestItems)

    // Assert
    expect(cartModel.updateQuantity).toHaveBeenCalledWith(10, 99, 5) // Capped at 5
    expect(result.adjustedItems.length).toBe(1)
    expect(result.adjustedItems[0]).toEqual({
      productName: 'Test Product',
      requestedQty: 6,
      adjustedQty: 5
    })
  })

  test('CRT-SNC-HP-002 should insert new guest items limited to stock', async () => {
    // Arrange: Server has no items. Guest has 10 items of a product with stock 5.
    const guestItems = [{ productId: 99, quantity: 10 }]

    vi.spyOn(productModel, 'findOneById').mockResolvedValue(mockProduct as any)
    vi.spyOn(cartModel, 'findItem').mockResolvedValue(null) // New item
    vi.spyOn(cartModel, 'upsertItem').mockResolvedValue(null as any)

    vi.spyOn(cartModel, 'getCartByUserId').mockResolvedValue([
      {
        id: 1,
        userId: 10,
        productId: 99,
        quantity: 5, // Capped at 5
        product: mockProduct
      }
    ] as any)

    // Act
    const result = await cartService.syncCart(10, guestItems)

    // Assert
    expect(cartModel.upsertItem).toHaveBeenCalledWith({ userId: 10, productId: 99, quantity: 5 })
    expect(result.adjustedItems[0].requestedQty).toBe(10)
    expect(result.adjustedItems[0].adjustedQty).toBe(5)
  })

  test('CRT-SNC-EG-002 should ignore non-existent or inactive products during sync', async () => {
    const guestItems = [{ productId: 99, quantity: 2 }]

    // Product is inactive
    vi.spyOn(productModel, 'findOneById').mockResolvedValue({ ...mockProduct, status: 'inactive' } as any)
    vi.spyOn(cartModel, 'findItem').mockResolvedValue(null)
    vi.spyOn(cartModel, 'updateQuantity').mockResolvedValue(null as any)
    vi.spyOn(cartModel, 'upsertItem').mockResolvedValue(null as any)
    vi.spyOn(cartModel, 'getCartByUserId').mockResolvedValue([])

    // Act
    const result = await cartService.syncCart(10, guestItems)

    // Assert: should not update or upsert
    expect(cartModel.updateQuantity).not.toHaveBeenCalled()
    expect(cartModel.upsertItem).not.toHaveBeenCalled()
    expect(result.items.length).toBe(0)
  })
})
