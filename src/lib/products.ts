import { sql } from '@payloadcms/db-postgres'
import type { Where } from 'payload'

import type { Category, Media, Product, Tenant } from '@/payload-types'

import { getPayloadClient } from './payload'
import type { SiteTenant } from './tenant'
import { catalogueStore } from './revalidate'

/**
 * PRICE RULES LIVE HERE, and only here.
 *
 * Components never receive a raw Product document. They receive a PublicProduct, which only
 * contains a price when the rules below say it may be shown. A hidden price therefore never
 * reaches the HTML, the RSC payload, the cart, a WhatsApp message, or any API response.
 */
import { amountOf, type PublicPrice } from './price'
export { amountOf, type PublicPrice }

export type PublicProduct = {
  id: number
  name: string
  slug: string
  company: string | null
  composition: string | null
  dosageForm: string | null
  packSize: string | null
  form: string | null
  /** Units per box and per shipper (case), as typed by the client, e.g. "10" or "10x10". */
  inBox: string | null
  shipper: string | null
  /** The company's division, used by the Division filter under each company. */
  division: string | null
  description: string | null
  imageUrl: string | null
  thumbUrl: string | null
  categoryName: string | null
  categorySlug: string | null
  isNew: boolean
  price: PublicPrice
}

export function resolvePrice(
  product: Pick<Product, 'mrp' | 'price' | 'priceOverride'>,
  tenant: Pick<Tenant, 'priceMode' | 'lockMrp'> & { priceUnlocked?: boolean },
): PublicPrice {
  // 0 or empty means "no price" (spreadsheets often use 0 for products without an MRP).
  const pos = (n: number | null | undefined) => (typeof n === 'number' && n > 0 ? n : null)
  const mrp = pos(product.mrp)
  const price = pos(product.price)
  // On a site that shows prices this stays 'amount' even with no numbers, so the product page can
  // show "Price ₹0.00". 'none' always means "prices are hidden here".
  const amount: PublicPrice = { kind: 'amount', mrp, price }

  if (product.priceOverride === 'hide') return { kind: 'none' }
  if (product.priceOverride === 'show') return amount

  switch (tenant.priceMode) {
    case 'visible':
      return amount
    case 'locked':
      // Unlocked with the price password, or a dashboard user of this site (see lib/priceLock.ts).
      if (tenant.priceUnlocked) return amount
      return { kind: 'amount', mrp: tenant.lockMrp ? null : mrp, price: null, locked: true }
    case 'quote':
      return { kind: 'quote' }
    case 'login':
      // TODO (distributor accounts): return `amount` when a logged-in distributor is viewing.
      return { kind: 'none' }
    case 'hidden':
    default:
      return { kind: 'none' }
  }
}

function toPublicProduct(product: Product, tenant: SiteTenant): PublicProduct {
  const image = typeof product.image === 'object' ? (product.image as Media | null) : null
  const category = typeof product.category === 'object' ? (product.category as Category | null) : null
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    company: product.company ?? null,
    composition: product.composition ?? null,
    dosageForm: product.dosageForm ?? null,
    packSize: product.packSize ?? null,
    form: product.form ?? product.dosageForm ?? null,
    inBox: product.inBox ?? null,
    shipper: product.shipper ?? null,
    division: product.division ?? null,
    description: product.description ?? null,
    imageUrl: image?.url ?? null,
    thumbUrl: image?.sizes?.card?.url ?? image?.url ?? null,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    isNew: Boolean(product.isFeatured),
    price: resolvePrice(product, tenant),
  }
}

// The Local API bypasses collection access rules by default, which is what we want for the
// public site. Every query below is therefore scoped to the tenant and to published documents
// by hand. Keep it that way for any new query.
const scope = (tenant: SiteTenant): Where[] => scopeFor(tenant.id)
const scopeFor = (tenantId: number): Where[] => [
  { tenant: { equals: tenantId } },
  { _status: { equals: 'published' } },
  // Visibility unticked hides the product; products from before this field existed count as visible.
  { or: [{ visible: { equals: true } }, { visible: { exists: false } }] },
]

export async function getPublicProducts(
  tenant: SiteTenant,
  opts: { categorySlug?: string; featuredOnly?: boolean; limit?: number } = {},
): Promise<PublicProduct[]> {
  const payload = await getPayloadClient()
  const and: Where[] = [...scope(tenant)]
  if (opts.featuredOnly) and.push({ isFeatured: { equals: true } })
  if (opts.categorySlug) and.push({ 'category.slug': { equals: opts.categorySlug } })

  const { docs } = await payload.find({
    collection: 'products',
    where: { and },
    sort: 'name',
    limit: opts.limit ?? 100,
    depth: 1,
  })
  return docs.map((p) => toPublicProduct(p, tenant))
}

/**
 * Catalogue rows as kept in the server cache. They still hold the raw MRP: prices are decided
 * per request by resolvePrice, so a change to the tenant's price setting applies at once and a
 * hidden price never leaves the server.
 */
type CatalogueRow = Omit<PublicProduct, 'price'> & { mrp: number | null; sellPrice: number | null; priceOverride: Product['priceOverride'] }

/** The list only needs enough salt for two lines and for search; the product page loads it all. */
const SALT_IN_LIST = 160
const CACHE_MS = 5 * 60 * 1000

/**
 * One direct SQL query instead of Payload's per-document processing: 6,000+ products load in
 * milliseconds this way rather than seconds. It reads published, visible products only, and the
 * same columns Payload writes (snake_case of the field names in collections/Products.ts).
 */
async function loadCatalogue(tenantId: number): Promise<CatalogueRow[]> {
  const payload = await getPayloadClient()
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }).drizzle
  const { rows } = await db.execute(sql`
    select p.id, p.name, p.slug, p.company, p.composition, p.dosage_form, p.pack_size, p.form,
           p.in_box, p.shipper, p.division,
           p.is_featured, p.mrp, p.price, p.price_override,
           c.name as category_name, c.slug as category_slug,
           m.url as image_url, m.sizes_card_url as thumb_url
    from products p
    left join categories c on c.id = p.category_id
    left join media m on m.id = p.image_id
    where p.tenant_id = ${tenantId}
      and p._status = 'published'
      and (p.visible is null or p.visible = true)
    order by p.name`)
  const str = (v: unknown) => (v == null || v === '' ? null : String(v))
  return rows.map((r) => {
    const salt = str(r.composition)
    const num = (v: unknown) => (v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null)
    return {
      id: Number(r.id),
      name: String(r.name),
      slug: String(r.slug),
      company: str(r.company),
      composition: salt && salt.length > SALT_IN_LIST ? `${salt.slice(0, SALT_IN_LIST)}…` : salt,
      dosageForm: str(r.dosage_form),
      packSize: str(r.pack_size),
      form: str(r.form) ?? str(r.dosage_form),
      inBox: str(r.in_box),
      shipper: str(r.shipper),
      division: str(r.division),
      description: null,
      imageUrl: str(r.image_url),
      thumbUrl: str(r.thumb_url) ?? str(r.image_url),
      categoryName: str(r.category_name),
      categorySlug: str(r.category_slug),
      isNew: Boolean(r.is_featured),
      mrp: num(r.mrp),
      sellPrice: num(r.price),
      priceOverride: (str(r.price_override) ?? 'inherit') as Product['priceOverride'],
    }
  })
}

/**
 * Whole published catalogue, for the products and order pages (filtered in the browser, as in
 * the reference). Kept in server memory per tenant and cleared as soon as a product, category or
 * image changes (see lib/revalidate.ts); refreshed every 5 minutes regardless, in case the site
 * runs on several servers.
 */
export async function getCatalogue(tenant: SiteTenant): Promise<PublicProduct[]> {
  const store = catalogueStore()
  let entry = store.get(tenant.id)
  if (!entry || Date.now() - entry.at > CACHE_MS) {
    const pending = loadCatalogue(tenant.id)
    entry = { at: Date.now(), rows: pending }
    store.set(tenant.id, entry)
    pending.catch(() => store.delete(tenant.id))
  }
  const rows = (await entry.rows) as CatalogueRow[]
  return rows.map(({ mrp, sellPrice, priceOverride, ...rest }) => ({ ...rest, price: resolvePrice({ mrp, price: sellPrice, priceOverride }, tenant) }))
}

export async function getPublicProduct(tenant: SiteTenant, slug: string): Promise<PublicProduct | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    where: { and: [...scope(tenant), { slug: { equals: slug } }] },
    limit: 1,
    depth: 1,
  })
  return docs[0] ? toPublicProduct(docs[0], tenant) : null
}

const norm = (s: string | null) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Same composition (salt) first, then same category; never the product itself. */
export async function getSimilarProducts(tenant: SiteTenant, product: PublicProduct, limit = 4): Promise<PublicProduct[]> {
  const all = await getCatalogue(tenant)
  const others = all.filter((p) => p.id !== product.id)
  const salt = norm(product.composition)
  const sameSalt = salt ? others.filter((p) => norm(p.composition) === salt) : []
  const sameCategory = product.categorySlug
    ? others.filter((p) => p.categorySlug === product.categorySlug && !sameSalt.includes(p))
    : []
  return [...sameSalt, ...sameCategory].slice(0, limit)
}

export async function getCategories(tenant: SiteTenant): Promise<Pick<Category, 'id' | 'name' | 'slug'>[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'categories',
    where: { tenant: { equals: tenant.id } },
    sort: 'sortOrder',
    limit: 200,
    depth: 0,
  })
  return docs.map(({ id, name, slug }) => ({ id, name, slug }))
}
