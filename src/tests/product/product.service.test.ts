/* eslint-disable @typescript-eslint/no-explicit-any */

import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { productService } from '~/services/productService.js'
import { productModel } from '~/models/productModel.js'
import { prisma } from '~/config/prisma.js'
import * as recommenderService from '~/services/recommenderIndexService.js'
import * as embeddingService from '~/services/embeddingIndexService.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const expectApiError = async (promise: Promise<unknown>, statusCode: number): Promise<void> => {
  await expect(promise).rejects.toMatchObject({ statusCode })
}

describe('productService.createNew (P1 - Admin Product CRUD)', () => {
  test('PRD-CRT-HP-001 should create product successfully with images and trigger AI reindex', async () => {
    const newProductData = {
      name: 'Test Product',
      categoryId: 1,
      price: 150000,
      stock: 10,
      status: 'active',
      images: ['url1.jpg', 'url2.jpg']
    }

    const createdProduct = {
      id: 99,
      ...newProductData,
      slug: 'test-product-123456',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    vi.spyOn(productModel, 'findByNameAndCategory').mockResolvedValue(null)
    vi.spyOn(productModel, 'createNew').mockResolvedValue(createdProduct as any)
    vi.spyOn(productModel, 'addImages').mockResolvedValue(null as any)
    vi.spyOn(productModel, 'findOneById').mockResolvedValue(createdProduct as any)
    vi.spyOn(recommenderService, 'requestReindex').mockImplementation(() => {})
    vi.spyOn(embeddingService, 'requestEmbeddingReindex').mockImplementation(() => {})

    const result = await productService.createNew(newProductData as any)

    expect(productModel.createNew).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Product' }))
    expect(productModel.addImages).toHaveBeenCalledWith(99, ['url1.jpg', 'url2.jpg'])
    expect(recommenderService.requestReindex).toHaveBeenCalledTimes(1)
    expect(embeddingService.requestEmbeddingReindex).toHaveBeenCalledWith(99)
    expect(result.id).toBe(99)
  })

  test('PRD-CRT-EG-001 should reject if product name already exists in category', async () => {
    const newProductData = { name: 'Existing Product', categoryId: 2, price: 100000, stock: 5, status: 'active' }
    const existingProduct = { id: 100, name: 'Existing Product', categoryId: 2 }

    vi.spyOn(productModel, 'findByNameAndCategory').mockResolvedValue(existingProduct as any)
    vi.spyOn(productModel, 'createNew').mockResolvedValue(null as any)
    vi.spyOn(prisma.category, 'findUnique').mockResolvedValue({ id: 2, name: 'Category A' } as any)

    await expectApiError(productService.createNew(newProductData as any), StatusCodes.CONFLICT)
    expect(productModel.createNew).not.toHaveBeenCalled()
  })
})

describe('productService.update (P1 - Admin Product CRUD)', () => {
  test('PRD-UPD-HP-001 should update product successfully, sync images and reindex', async () => {
    const updateData = { name: 'Updated Product', images: ['new1.jpg'] }
    const existingProduct = { id: 99, name: 'Old Product', categoryId: 1 }
    const updatedProduct = { ...existingProduct, name: 'Updated Product', slug: 'updated-product-123' }

    vi.spyOn(productModel, 'findOneById').mockResolvedValue(existingProduct as any)
    vi.spyOn(productModel, 'findByNameAndCategory').mockResolvedValue(null)
    vi.spyOn(productModel, 'update').mockResolvedValue(updatedProduct as any)
    vi.spyOn(productModel, 'syncImages').mockResolvedValue(null as any)
    vi.spyOn(recommenderService, 'requestReindex').mockImplementation(() => {})
    vi.spyOn(embeddingService, 'requestEmbeddingReindex').mockImplementation(() => {})

    const result = await productService.update('99', updateData as any)

    expect(productModel.update).toHaveBeenCalledWith(99, expect.objectContaining({ name: 'Updated Product' }))
    expect(productModel.syncImages).toHaveBeenCalledWith(99, ['new1.jpg'])
    expect(recommenderService.requestReindex).toHaveBeenCalledTimes(1)
    expect(embeddingService.requestEmbeddingReindex).toHaveBeenCalledWith(99)
  })

  test('PRD-UPD-ER-001 should throw NOT FOUND if product does not exist', async () => {
    vi.spyOn(productModel, 'findOneById').mockResolvedValue(null)
    await expectApiError(productService.update('99', {}), StatusCodes.NOT_FOUND)
  })
})

describe('productService.deleteProduct (P1 - Admin Product CRUD)', () => {
  test('PRD-DEL-HP-001 should delete product and trigger reindex', async () => {
    vi.spyOn(productModel, 'findOneById').mockResolvedValue({ id: 99 } as any)
    vi.spyOn(productModel, 'deleteOneById').mockResolvedValue(true)
    vi.spyOn(recommenderService, 'requestReindex').mockImplementation(() => {})
    vi.spyOn(embeddingService, 'requestEmbeddingReindex').mockImplementation(() => {})

    const result = await productService.deleteProduct('99')

    expect(productModel.deleteOneById).toHaveBeenCalledWith(99)
    expect(recommenderService.requestReindex).toHaveBeenCalledTimes(1)
    expect(embeddingService.requestEmbeddingReindex).toHaveBeenCalledWith(99)
    expect(result.deletedCount).toBe(1)
  })
})

describe('productService.deleteSelectedProducts (P1 - Admin Product CRUD)', () => {
  test('PRD-BDEL-HP-001 should bulk delete products and trigger reindex for each', async () => {
    vi.spyOn(productModel, 'findByIds').mockResolvedValue([{ id: 1 }, { id: 2 }] as any)
    vi.spyOn(productModel, 'deleteMany').mockResolvedValue({ count: 2 })
    vi.spyOn(recommenderService, 'requestReindex').mockImplementation(() => {})
    vi.spyOn(embeddingService, 'requestEmbeddingReindex').mockImplementation(() => {})

    const result = await productService.deleteSelectedProducts(['1', '2'])

    expect(productModel.deleteMany).toHaveBeenCalledWith({ id: { in: [1, 2] } })
    expect(recommenderService.requestReindex).toHaveBeenCalledTimes(1)
    expect(embeddingService.requestEmbeddingReindex).toHaveBeenCalledTimes(2)
    expect(result.deletedCount).toBe(2)
  })

  test('PRD-BDEL-ER-001 should reject if any ID is not found', async () => {
    vi.spyOn(productModel, 'findByIds').mockResolvedValue([{ id: 1 }] as any) // Only found ID 1, not 2

    await expectApiError(productService.deleteSelectedProducts(['1', '2']), StatusCodes.NOT_FOUND)
  })
})
