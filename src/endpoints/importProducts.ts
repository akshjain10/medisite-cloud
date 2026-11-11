import type { Endpoint, PayloadRequest } from 'payload'

import { canManageTenant, isPortalUser, tenantRole } from '../access'
import { slugify } from '../lib/slugify'
import type { ColumnKey, ImportResult, ImportRow } from '../lib/productImport'
import { COLUMNS } from '../lib/productImport'
import { cleanText, parseBool, parseMrp } from '../lib/productImport'
import { refreshCatalogue } from '../lib/revalidate'

const MAX_ROWS_PER_REQUEST = 500
const PARALLEL = 5

const json = (body: unknown, status = 200) => Response.json(body, { status })

/** Re-check every value on the server: never trust what the browser sends. */
function sanitize(raw: Partial<ImportRow>, i: number): ImportRow | null {
  const name = cleanText(raw?.name, 200)
  if (!name) return null
  return {
    line: Number.isInteger(raw?.line) ? Number(raw.line) : i + 2,
    code: cleanText(raw?.code, 100),
    name,
    salt: cleanText(raw?.salt, 4000),
    company: cleanText(raw?.company, 200),
    packing: cleanText(raw?.packing, 100),
    form: cleanText(raw?.form, 100),
    inBox: cleanText(raw?.inBox, 50),
    shipper: cleanText(raw?.shipper, 50),
    mrp: parseMrp(raw?.mrp),
    price: parseMrp(raw?.price),
    category: cleanText(raw?.category, 100),
    visible: parseBool(raw?.visible, true),
    division: cleanText(raw?.division, 100),
    newArrival: parseBool(raw?.newArrival, false),
  }
}

/** Run tasks a few at a time, so a big file does not exhaust the database connections. */
async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn))
}

/**
 * POST /api/products/import
 * Body: { tenant: number, rows: ImportRow[], columns?: ColumnKey[], allowCreate: boolean }
 * Only fields whose column is in the file (`columns`) are changed on existing products, so a file
 * without e.g. a Price column never wipes prices entered by hand.
 * The browser sends the file in batches of up to 500 rows and shows progress.
 */
export const importProductsEndpoint: Endpoint = {
  path: '/import',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const user = req.user
    if (!user) return json({ error: 'Please log in again.' }, 401)

    let body: { tenant?: unknown; rows?: unknown; columns?: unknown; allowCreate?: unknown }
    try {
      body = (await req.json?.()) ?? {}
    } catch {
      return json({ error: 'The upload could not be read.' }, 400)
    }

    const tenantId = Number(body.tenant)
    if (!Number.isInteger(tenantId)) return json({ error: 'Choose a tenant.' }, 400)
    if (!isPortalUser(user) && tenantRole(user, tenantId) === null)
      return json({ error: 'You do not have access to this tenant.' }, 403)
    const exists = await req.payload.count({ collection: 'tenants', where: { id: { equals: tenantId } }, overrideAccess: true })
    if (!exists.totalDocs) return json({ error: 'That tenant no longer exists.' }, 404)

    if (!Array.isArray(body.rows)) return json({ error: 'No rows received.' }, 400)
    if (body.rows.length > MAX_ROWS_PER_REQUEST) return json({ error: `Send at most ${MAX_ROWS_PER_REQUEST} rows at a time.` }, 400)

    // Tenant Editors may update products but not add them.
    const mayCreate = canManageTenant(user, tenantId) && body.allowCreate !== false
    const payload = req.payload
    const result: ImportResult = { created: 0, updated: 0, unchanged: 0, skipped: [], failed: [] }

    // ---- Load what this tenant already has (one query each) ----
    const existing = await payload.find({
      collection: 'products',
      where: { tenant: { equals: tenantId } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: {
        code: true, name: true, slug: true, composition: true, company: true, packSize: true,
        mrp: true, price: true, form: true, inBox: true, shipper: true, category: true, visible: true, division: true, isFeatured: true,
      },
    })
    const byCode = new Map<string, (typeof existing.docs)[number]>()
    const byName = new Map<string, (typeof existing.docs)[number][]>()
    const usedSlugs = new Set<string>()
    for (const d of existing.docs) {
      // IDs are matched exactly: "naproxen-500" and "NAPROXEN-500" can be different products.
      if (d.code) byCode.set(d.code, d)
      const k = d.name.toLowerCase()
      byName.set(k, [...(byName.get(k) ?? []), d])
      if (d.slug) usedSlugs.add(d.slug)
    }

    const cats = await payload.find({
      collection: 'categories',
      where: { tenant: { equals: tenantId } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { name: true, slug: true },
    })
    const categoryIds = new Map(cats.docs.map((c) => [c.name.toLowerCase(), c.id]))
    const categorySlugs = new Set(cats.docs.map((c) => c.slug))
    const categoryFor = async (name: string | null): Promise<number | null> => {
      if (!name) return null
      const key = name.toLowerCase()
      const known = categoryIds.get(key)
      if (known) return known
      let slug = slugify(name)
      for (let n = 2; categorySlugs.has(slug); n++) slug = `${slugify(name)}-${n}`
      categorySlugs.add(slug)
      const created = await payload.create({
        collection: 'categories',
        data: { tenant: tenantId, name, slug, sortOrder: categoryIds.size } as never,
        overrideAccess: true,
      })
      categoryIds.set(key, created.id)
      return created.id
    }

    const newSlug = (row: ImportRow) => {
      const base = slugify(row.name)
      const code = row.code ? slugify(row.code) : ''
      let slug = base
      if (usedSlugs.has(slug) && code && code !== base) slug = `${base}-${code}`
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`
      usedSlugs.add(slug)
      return slug
    }

    const rows = (body.rows as Partial<ImportRow>[]).map(sanitize)
    rows.forEach((r, i) => {
      if (!r) result.skipped.push({ line: (body.rows as Partial<ImportRow>[])[i]?.line ?? i + 2, name: '', reason: 'No product name' })
    })

    // Categories first, one at a time, so two rows never create the same category twice.
    const valid = rows.filter((r): r is ImportRow => r !== null)
    const known = new Set<string>(COLUMNS.map((c) => c.key))
    const present = new Set<ColumnKey>(
      Array.isArray(body.columns) ? (body.columns.filter((c) => typeof c === 'string' && known.has(c)) as ColumnKey[]) : COLUMNS.map((c) => c.key),
    )
    present.add('name')
    const categoryOf = new Map<ImportRow, number | null>()
    for (const r of valid) categoryOf.set(r, await categoryFor(r.category))

    // Decide create / update / skip before writing anything, so slugs are unique within the batch.
    type Plan = { row: ImportRow; id?: number; data: Record<string, unknown> }
    const plans: Plan[] = []
    for (const row of valid) {
      const all = {
        code: row.code,
        name: row.name,
        composition: row.salt,
        company: row.company,
        packSize: row.packing,
        form: row.form,
        inBox: row.inBox,
        shipper: row.shipper,
        mrp: row.mrp,
        price: row.price,
        category: categoryOf.get(row) ?? null,
        visible: row.visible,
        division: row.division,
        isFeatured: row.newArrival,
      }
      const from: Record<keyof typeof all, ColumnKey> = {
        code: 'code', name: 'name', composition: 'salt', company: 'company', packSize: 'packing', form: 'form', inBox: 'inBox', shipper: 'shipper',
        mrp: 'mrp', price: 'price', category: 'category', visible: 'visible', division: 'division', isFeatured: 'newArrival',
      }
      // Only fields that have a column in the file.
      const fields = Object.fromEntries(
        (Object.keys(all) as (keyof typeof all)[]).filter((k) => present.has(from[k])).map((k) => [k, all[k]]),
      ) as Partial<typeof all>
      const match = row.code ? byCode.get(row.code) : (() => {
        const same = byName.get(row.name.toLowerCase()) ?? []
        return same.length === 1 ? same[0] : undefined
      })()

      if (match?.id === -1) {
        result.skipped.push({ line: row.line, name: row.name, reason: 'Same ID appears earlier in the file' })
      } else if (match) {
        const changed = (Object.keys(fields) as (keyof typeof fields)[]).some((k) => {
          const before = k === 'category' ? (match.category as number | null | undefined) ?? null : (match as Record<string, unknown>)[k] ?? null
          return before !== (fields[k] ?? null)
        })
        if (!changed) result.unchanged++
        else plans.push({ row, id: match.id, data: { ...fields, _status: 'published' } })
      } else if (!mayCreate) {
        result.skipped.push({ line: row.line, name: row.name, reason: 'New product; Tenant Editors can only update existing products' })
      } else {
        const data = { visible: true, isFeatured: false, ...fields, tenant: tenantId, slug: newSlug(row), _status: 'published' }
        plans.push({ row, data })
        // Later rows in this batch with the same ID update this one instead of adding a duplicate.
        if (row.code) byCode.set(row.code, { id: -1, name: row.name } as (typeof existing.docs)[number])
      }
    }

    await inBatches(plans, PARALLEL, async ({ row, id, data }) => {
      try {
        if (id !== undefined) {
          await payload.update({ collection: 'products', id, data: data as never, overrideAccess: true, context: { slugsResolved: true, skipRevalidate: true } })
          result.updated++
        } else {
          await payload.create({ collection: 'products', data: data as never, overrideAccess: true, context: { slugsResolved: true, skipRevalidate: true } })
          result.created++
        }
      } catch (err) {
        result.failed.push({ line: row.line, name: row.name, reason: err instanceof Error ? err.message : 'Could not be saved' })
      }
    })

    refreshCatalogue(tenantId)
    return json(result)
  },
}
