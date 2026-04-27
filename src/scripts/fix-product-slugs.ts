import 'dotenv/config'

import { Pool } from 'pg'
import { env } from '~/config/environment.js'
import { slugify } from '~/utils/helper.js'

type SlugRow = {
  id: number
  name: string
  slug: string | null
}

const normalizeRows = (rows: SlugRow[], label: string): Array<{ id: number; slug: string }> => {
  const takenSlugs = new Set<string>()

  return rows.map((row) => {
    const baseSlug = slugify(row.name) || `${label}-${row.id}`
    let candidate = baseSlug
    let attempt = 0

    while (takenSlugs.has(candidate)) {
      attempt += 1
      candidate = `${baseSlug}-${row.id}${attempt > 1 ? `-${attempt}` : ''}`
    }

    takenSlugs.add(candidate)

    return {
      id: row.id,
      slug: candidate
    }
  })
}

const pool = new Pool({
  connectionString: env.DATABASE_DIRECT_URL || env.DATABASE_URL
})

const updateRows = async (
  tableName: 'products' | 'categories',
  updates: Array<{ id: number; slug: string }>
): Promise<void> => {
  for (const item of updates) {
    await pool.query(
      `UPDATE ${tableName} SET slug = $1, updated_at = NOW() WHERE id = $2`,
      [item.slug, item.id]
    )
  }

  process.stdout.write(`Updated ${updates.length} ${tableName} slug(s).\n`)
}

const fixSlugs = async (): Promise<void> => {
  const products = await pool.query<SlugRow>('SELECT id, name, slug FROM products ORDER BY id ASC')

  const categories = await pool.query<SlugRow>('SELECT id, name, slug FROM categories ORDER BY id ASC')

  const productUpdates = normalizeRows(products.rows, 'product')
  const categoryUpdates = normalizeRows(categories.rows, 'category')

  await updateRows('products', productUpdates)
  await updateRows('categories', categoryUpdates)
}

fixSlugs()
  .catch((error) => {
    if (error instanceof Error) {
      process.stderr.write(`Failed to normalize slugs: ${error.message}\n`)
      if (error.stack) {
        process.stderr.write(`${error.stack}\n`)
      }
    } else {
      process.stderr.write(`Failed to normalize slugs: ${JSON.stringify(error)}\n`)
    }

    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })