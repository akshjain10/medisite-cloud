/**
 * In-memory cache of each tenant's public catalogue (see getCatalogue in lib/products.ts).
 * Kept on globalThis so the admin API and the public pages, which Next.js bundles separately,
 * share one cache within the server process.
 */
type Entry = { at: number; rows: Promise<unknown[]> }
const KEY = Symbol.for('pharma-sites.catalogue-cache')

export function catalogueStore(): Map<number, Entry> {
  const g = globalThis as unknown as Record<symbol, Map<number, Entry> | undefined>
  return (g[KEY] ??= new Map())
}

/** Make the public site show product changes straight away. Safe to call from anywhere. */
export function refreshCatalogue(tenantId: number | string | null | undefined) {
  if (tenantId == null) return
  catalogueStore().delete(Number(tenantId))
}
