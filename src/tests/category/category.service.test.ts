/* eslint-disable @typescript-eslint/no-explicit-any */

import { StatusCodes } from 'http-status-codes'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { categoryService } from '~/services/categoryService.js'
import { categoryModel } from '~/models/categoryModel.js'
import * as recommenderService from '~/services/recommenderIndexService.js'
import * as embeddingService from '~/services/embeddingIndexService.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const expectApiError = async (promise: Promise<unknown>, statusCode: number): Promise<void> => {
  await expect(promise).rejects.toMatchObject({ statusCode })
}

describe('categoryService CRUD (P1 - Wave 3)', () => {
  test('CAT-CRT-HP-001 should create category successfully and generate slug', async () => {
    // Arrange
    const input = { name: 'Thời trang', image: 'test.jpg' }
    const createdCategory = { id: 1, ...input, slug: 'thoi-trang' }

    vi.spyOn(categoryModel, 'findBySlug').mockResolvedValue(null)
    vi.spyOn(categoryModel, 'create').mockResolvedValue(createdCategory as any)

    // Act
    const result = await categoryService.createNew(input)

    // Assert
    expect(categoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Thời trang', slug: 'thoi-trang' })
    )
    expect(result.id).toBe(1)
  })

  test('CAT-UPD-HP-001 should update category name and update slug', async () => {
    // Arrange
    const initialCategory = { id: 1, name: 'Thời trang cũ', slug: 'thoi-trang-cu' }
    const updatedCategory = { id: 1, name: 'Thời trang mới', slug: 'thoi-trang-moi' }

    vi.spyOn(categoryModel, 'findById').mockResolvedValue(initialCategory as any)
    vi.spyOn(categoryModel, 'findBySlug').mockResolvedValue(null)
    vi.spyOn(categoryModel, 'update').mockResolvedValue(updatedCategory as any)
    vi.spyOn(recommenderService, 'requestReindex').mockImplementation(() => {})
    vi.spyOn(embeddingService, 'requestEmbeddingReindex').mockImplementation(() => {})

    // Act
    const result = await categoryService.update(1, { name: 'Thời trang mới' })

    // Assert
    expect(categoryModel.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Thời trang mới', slug: 'thoi-trang-moi' })
    )
    expect(recommenderService.requestReindex).toHaveBeenCalledTimes(1)
    expect(result.name).toBe('Thời trang mới')
  })

  test('CAT-UPD-ER-001 should throw not found error when updating non-existent category', async () => {
    // Arrange
    vi.spyOn(categoryModel, 'findById').mockResolvedValue(null)

    // Act + Assert
    await expectApiError(categoryService.update(999, { name: 'New' }), StatusCodes.NOT_FOUND)
  })

  test('CAT-DEL-HP-001 should delete category if no products are associated', async () => {
    // Arrange
    vi.spyOn(categoryModel, 'countProducts').mockResolvedValue(0)
    vi.spyOn(categoryModel, 'deleteById').mockResolvedValue(true as any)

    // Act
    const result = await categoryService.deleteCategory(1)

    // Assert
    expect(categoryModel.deleteById).toHaveBeenCalledWith(1)
    expect(result).toBe(true)
  })

  test('CAT-DEL-ER-001 should reject deletion if category has products', async () => {
    // Arrange
    vi.spyOn(categoryModel, 'countProducts').mockResolvedValue(5)

    // Act + Assert
    await expectApiError(categoryService.deleteCategory(1), StatusCodes.BAD_REQUEST)
  })
})
