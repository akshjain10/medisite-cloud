/**
 * Spreadsheet format for products. Shared by the browser (preview) and the server (import),
 * so both read a file the same way. No server-only imports here.
 *
 * Expected columns, same as the product export you already use:
 *   id, Name, Salt, Company, Packing, MRP, Category, visibility, Division, newArrivals
 * plus the optional Form, In Box, Shipper and Price columns.
 * Column names are matched without caring about case or spaces, and a few common
 * alternatives are accepted (e.g. "Product Name", "Composition", "Pack Size").
 */

export type ImportRow = {
  /** 1-based line number in the file, counting the header as line 1. */
  line: number
  code: string | null
  name: string
  salt: string | null
  company: string | null
  packing: string | null
  form: string | null
  inBox: string | null
  shipper: string | null
  mrp: number | null
  price: number | null
  category: string | null
  visible: boolean
  division: string | null
  newArrival: boolean
}

export type ImportResult = {
  created: number
  updated: number
  unchanged: number
  skipped: { line: number; name: string; reason: string }[]
  failed: { line: number; name: string; reason: string }[]
}

export const COLUMNS = [
  { key: 'code', label: 'id', aliases: ['id', 'code', 'productid', 'productcode', 'itemcode', 'sku'] },
  { key: 'name', label: 'Name', aliases: ['name', 'product', 'productname', 'brandname', 'itemname'], required: true },
  { key: 'salt', label: 'Salt', aliases: ['salt', 'composition', 'generic', 'genericname'] },
  { key: 'company', label: 'Company', aliases: ['company', 'manufacturer', 'mfr', 'companyname'] },
  { key: 'packing', label: 'Packing', aliases: ['packing', 'pack', 'packsize', 'packaging'] },
  { key: 'form', label: 'Form', aliases: ['form', 'dosageform', 'formulation'] },
  { key: 'inBox', label: 'In Box', aliases: ['inbox', 'boxqty', 'boxquantity', 'qtyinbox', 'unitsperbox', 'box'] },
  { key: 'shipper', label: 'Shipper', aliases: ['shipper', 'shipperqty', 'shipperquantity', 'case', 'caseqty', 'casesize', 'carton'] },
  { key: 'mrp', label: 'MRP', aliases: ['mrp', 'mrprs', 'mrpinr', 'maximumretailprice'] },
  { key: 'price', label: 'Price', aliases: ['price', 'sellingprice', 'saleprice', 'rate', 'offerprice', 'ourprice'] },
  { key: 'category', label: 'Category', aliases: ['category', 'type'] },
  { key: 'visible', label: 'visibility', aliases: ['visibility', 'visible', 'show', 'showonwebsite'] },
  { key: 'division', label: 'Division', aliases: ['division'] },
  { key: 'newArrival', label: 'newArrivals', aliases: ['newarrivals', 'newarrival', 'new', 'isnew'] },
] as const

export type ColumnKey = (typeof COLUMNS)[number]['key']

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Which spreadsheet column (index) feeds which product field. */
export function mapHeaders(headers: string[]): Partial<Record<ColumnKey, number>> {
  const map: Partial<Record<ColumnKey, number>> = {}
  headers.forEach((h, i) => {
    const s = squash(String(h ?? ''))
    const col = COLUMNS.find((c) => (c.aliases as readonly string[]).includes(s))
    if (col && map[col.key] === undefined) map[col.key] = i
  })
  return map
}

const NULLS = new Set(['', 'null', 'none', 'n/a', 'na', '-', 'undefined'])

export const cleanText = (v: unknown, max = 2000): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/\s+/g, ' ').trim()
  return NULLS.has(s.toLowerCase()) ? null : s.slice(0, max)
}

export const parseBool = (v: unknown, fallback: boolean): boolean => {
  if (typeof v === 'boolean') return v
  const s = cleanText(v)?.toLowerCase()
  if (!s) return fallback
  if (['true', 'yes', 'y', '1', 'visible', 'show'].includes(s)) return true
  if (['false', 'no', 'n', '0', 'hidden', 'hide'].includes(s)) return false
  return fallback
}

export const parseMrp = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null
  const s = cleanText(v)
  if (!s) return null
  const n = Number(s.replace(/[₹,\s]|rs\.?|inr/gi, ''))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

/**
 * Turn raw rows (first row = headers) into ImportRows. Rows without a name are reported,
 * not silently dropped. Returns warnings the preview can show.
 */
export function rowsFromTable(table: unknown[][]): {
  rows: ImportRow[]
  missingColumns: string[]
  foundColumns: string[]
  /** Fields that have a column in the file. Only these are changed on existing products. */
  foundKeys: ColumnKey[]
  problems: { line: number; reason: string }[]
} {
  const [header = [], ...body] = table
  const map = mapHeaders(header.map((h) => String(h ?? '')))
  const get = (r: unknown[], k: ColumnKey) => (map[k] === undefined ? undefined : r[map[k] as number])
  const rows: ImportRow[] = []
  const problems: { line: number; reason: string }[] = []

  body.forEach((r, i) => {
    const line = i + 2
    if (!r || r.every((c) => cleanText(c) === null)) return // blank line
    const name = cleanText(get(r, 'name'), 200)
    if (!name) {
      problems.push({ line, reason: 'No product name' })
      return
    }
    const rawMrp = get(r, 'mrp')
    const mrp = parseMrp(rawMrp)
    if (mrp === null && cleanText(rawMrp) !== null) problems.push({ line, reason: `MRP "${String(rawMrp)}" is not a number; left empty` })
    const rawPrice = get(r, 'price')
    const price = parseMrp(rawPrice)
    if (price === null && cleanText(rawPrice) !== null) problems.push({ line, reason: `Price "${String(rawPrice)}" is not a number; left empty` })
    rows.push({
      line,
      code: cleanText(get(r, 'code'), 100),
      name,
      salt: cleanText(get(r, 'salt'), 4000),
      company: cleanText(get(r, 'company'), 200),
      packing: cleanText(get(r, 'packing'), 100),
      form: cleanText(get(r, 'form'), 100),
      inBox: cleanText(get(r, 'inBox'), 50),
      shipper: cleanText(get(r, 'shipper'), 50),
      mrp,
      price,
      category: cleanText(get(r, 'category'), 100),
      visible: parseBool(get(r, 'visible'), true),
      division: cleanText(get(r, 'division'), 100),
      newArrival: parseBool(get(r, 'newArrival'), false),
    })
  })

  return {
    rows,
    foundColumns: COLUMNS.filter((c) => map[c.key] !== undefined).map((c) => c.label),
    foundKeys: COLUMNS.filter((c) => map[c.key] !== undefined).map((c) => c.key),
    missingColumns: COLUMNS.filter((c) => map[c.key] === undefined).map((c) => c.label),
    problems,
  }
}

/** A tiny example file people can fill in. */
export const TEMPLATE_CSV =
  'id,Name,Salt,Company,Packing,Form,In Box,Shipper,MRP,Price,Category,visibility,Division,newArrivals\n' +
  'DEMO001,PARACETAMOL 650 TAB,PARACETAMOL IP 650MG,DEMO PHARMA LTD.,15\'S,Tablet,10,300,32,28,Pain relief,true,General,false\n'
