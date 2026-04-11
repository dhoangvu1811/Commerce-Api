import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

interface ExistingProductRecord {
  slug: string
}

interface SeedProductRecord {
  name: string
  image?: string | null
  description?: string | null
  price: string | number
  stock: number
  rating: string | number
  selled: number
  discount: string | number
  slug: string
  category_id: number
  status?: string
}

const loadJson = async <T>(filePath: string): Promise<T> => {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw) as T
}

const toNumber = (value: string | number | undefined, fallback: number = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const main = async (): Promise<void> => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  const projectRoot = process.cwd()
  const existingProductsFile = process.env.EXISTING_PRODUCTS_FILE || 'products.json'
  const seedProductsFile = process.env.SEED_PRODUCTS_FILE || 'prisma/products.seed.50.json'

  const existingProductsPath = path.resolve(projectRoot, existingProductsFile)
  const seedProductsPath = path.resolve(projectRoot, seedProductsFile)

  let existingProducts: ExistingProductRecord[] = []
  try {
    existingProducts = await loadJson<ExistingProductRecord[]>(existingProductsPath)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code !== 'ENOENT') {
      throw error
    }
  }

  const seedProducts = await loadJson<SeedProductRecord[]>(seedProductsPath)

  const existingSlugs = Array.from(
    new Set(
      existingProducts
        .map((item) => String(item.slug || '').trim())
        .filter(Boolean)
    )
  )

  const filteredSeedProducts = seedProducts.filter(
    (item) => !existingSlugs.includes(String(item.slug || '').trim())
  )

  const categoryIds = Array.from(new Set(filteredSeedProducts.map((item) => Number(item.category_id))))

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const existingCategories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds }
      },
      select: { id: true }
    })

    const existingCategorySet = new Set(existingCategories.map((item) => item.id))
    const missingCategoryIds = categoryIds.filter((id) => !existingCategorySet.has(id))

    if (missingCategoryIds.length > 0) {
      throw new Error(`Missing category IDs: ${missingCategoryIds.join(', ')}`)
    }

    const existingProductsInDb = await prisma.product.findMany({
      where: {
        slug: {
          in: existingSlugs
        }
      },
      select: {
        id: true,
        slug: true
      }
    })

    const existingProductIds = existingProductsInDb.map((item) => item.id)
    const referencedOrderItems =
      existingProductIds.length > 0
        ? await prisma.orderItem.findMany({
            where: {
              productId: {
                in: existingProductIds
              }
            },
            select: {
              productId: true
            }
          })
        : []

    const referencedProductIdSet = new Set(
      referencedOrderItems.map((item) => item.productId)
    )
    const referencedProductIds = Array.from(referencedProductIdSet)
    const deletableProductIds = existingProductIds.filter(
      (id) => !referencedProductIdSet.has(id)
    )

    const result = await prisma.$transaction(async (tx) => {
      const deleted =
        deletableProductIds.length > 0
          ? await tx.product.deleteMany({
              where: {
                id: {
                  in: deletableProductIds
                }
              }
            })
          : { count: 0 }

      const inactivated =
        referencedProductIds.length > 0
          ? await tx.product.updateMany({
              where: {
                id: {
                  in: referencedProductIds
                }
              },
              data: {
                status: 'inactive'
              }
            })
          : { count: 0 }

      const created = await tx.product.createMany({
        data: filteredSeedProducts.map((item) => ({
          name: item.name,
          image: item.image || null,
          description: item.description || null,
          price: toNumber(item.price, 0),
          stock: toNumber(item.stock, 0),
          rating: toNumber(item.rating, 0),
          selled: toNumber(item.selled, 0),
          discount: toNumber(item.discount, 0),
          slug: item.slug,
          categoryId: Number(item.category_id),
          status: item.status || 'active'
        })),
        skipDuplicates: true
      })

      return {
        deletedCount: deleted.count,
        inactivatedCount: inactivated.count,
        insertedCount: created.count
      }
    })

    const totalProducts = await prisma.product.count()

    console.log(
      JSON.stringify(
        {
          message: 'Seed products completed',
          deletedCount: result.deletedCount,
          inactivatedCount: result.inactivatedCount,
          insertedCount: result.insertedCount,
          totalProducts
        },
        null,
        2
      )
    )
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Seed products failed:', error)
  process.exit(1)
})
