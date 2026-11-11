'use client'

import { Filter, LayoutGrid, Lock, Plus, Rows3, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { useCart } from '@/components/cart/CartProvider'
import { UnlockButton, usePriceLock } from '@/components/PriceLock'
import { PriceTag } from '@/components/PriceTag'
import { ProductCard, type CardOptions } from '@/components/ProductCard'
import { Button, buttonClass, Card, CardContent, CardHeader, CardTitle, cx, inputClass } from '@/components/ui'
import { formatINR } from '@/lib/format'
import { amountOf } from '@/lib/price'
import type { PublicProduct } from '@/lib/products'

import PriceRange from './PriceRange'

type Props = {
  products: PublicProduct[]
  initialCategory: string | null
  /** From ?company= (e.g. the "Browse products" link on the Catalogues page). */
  initialCompany: string | null
  perPage: number
  cardOptions: CardOptions
  showRequest: boolean
}

/** Division filter keys combine company and division: two companies can both have a "Healthcare" division. */
const SEP = '\u0001'
const divKey = (company: string, division: string) => `${company}${SEP}${division}`
const divisionOf = (key: string) => key.slice(key.indexOf(SEP) + 1)

const tally = (values: (string | null)[]) => {
  const m = new Map<string, number>()
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1)
  return m
}
const n = (v: number) => v.toLocaleString('en-IN')

const uniqueSorted = (values: (string | null)[]) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort((a, b) => a.localeCompare(b))

function CheckList({
  title,
  idPrefix,
  values,
  selected,
  onToggle,
  onAll,
  counts,
  labelOf = (v) => v,
  allLabel = 'All',
  id,
}: {
  title: string
  idPrefix: string
  values: string[]
  selected: string[]
  onToggle: (v: string) => void
  onAll: () => void
  /** Number of products per value, shown after each name. */
  counts?: Map<string, number>
  labelOf?: (v: string) => string
  allLabel?: string
  id?: string
}) {
  if (values.length === 0) return null
  return (
    <fieldset id={id} className="scroll-mt-24">
      <legend className="mb-2 font-medium">{title}</legend>
      <div className="max-h-60 space-y-2 overflow-y-auto overflow-x-hidden pr-1">
        <label className="flex items-start gap-2" htmlFor={`${idPrefix}-all`}>
          <input id={`${idPrefix}-all`} type="checkbox" className="mt-1 shrink-0 accent-[var(--primary)]" checked={selected.length === 0} onChange={onAll} />
          <span>{allLabel}</span>
        </label>
        {values.map((v, i) => (
          <label key={v} className="flex items-start gap-2 text-sm leading-snug" htmlFor={`${idPrefix}-${i}`} title={v}>
            <input
              id={`${idPrefix}-${i}`}
              type="checkbox"
              className="mt-0.5 shrink-0 accent-[var(--primary)]"
              checked={selected.includes(v)}
              onChange={() => onToggle(v)}
            />
            {/* Long names (e.g. "INTAS PHARMACEUTICALS LIMITED") wrap instead of spilling out. */}
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{labelOf(v)}</span>
            {counts && <span className="shrink-0 text-xs tabular-nums text-gray-400">{counts.get(v) ?? 0}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** The reference's catalogue: filters sidebar, search, items per page and pagination, all in the browser. */
export default function ProductsBrowser({ products, initialCategory, initialCompany, perPage: initialPerPage, cardOptions, showRequest }: Props) {
  const cart = useCart()
  const lock = usePriceLock()
  const categories = useMemo(() => uniqueSorted(products.map((p) => p.categoryName)), [products])
  const companies = useMemo(() => uniqueSorted(products.map((p) => p.company)), [products])
  const forms = useMemo(() => uniqueSorted(products.map((p) => p.form)), [products])

  // Products per company / division, for the counts next to each filter.
  const companyCounts = useMemo(() => tally(products.map((p) => p.company)), [products])
  const divisionCounts = useMemo(() => tally(products.map((p) => (p.company && p.division ? divKey(p.company, p.division) : null))), [products])
  const companiesByCount = useMemo(() => [...companies].sort((a, b) => (companyCounts.get(b) ?? 0) - (companyCounts.get(a) ?? 0) || a.localeCompare(b)), [companies, companyCounts])
  const hasPriceColumns = useMemo(() => products.some((p) => p.price.kind === 'amount'), [products])

  // Price filter only exists when this client actually shows prices.
  const priced = useMemo(() => products.flatMap((p) => { const a = amountOf(p.price); return a === null ? [] : [a] }), [products])
  const priceBounds = useMemo<[number, number] | null>(() => {
    if (priced.length < 2) return null
    const lo = Math.floor(Math.min(...priced))
    const hi = Math.ceil(Math.max(...priced))
    return lo < hi ? [lo, hi] : null
  }, [priced])

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [cats, setCats] = useState<string[]>(() => {
    const name = products.find((p) => p.categorySlug === initialCategory)?.categoryName
    return name ? [name] : []
  })
  const [comps, setComps] = useState<string[]>(() => {
    const match = initialCompany ? companies.find((c) => c.toLowerCase() === initialCompany.toLowerCase()) : undefined
    return match ? [match] : []
  })
  // Divisions are per company: stored as divKey(company, division).
  const [divSel, setDivSel] = useState<string[]>([])
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [showAllCompanies, setShowAllCompanies] = useState(false)
  const [formSel, setFormSel] = useState<string[]>([])
  const [range, setRange] = useState<[number, number] | null>(priceBounds)
  const [perPage, setPerPage] = useState(initialPerPage)
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Remember grid / table per browser (a convenience only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem('products-view')
      if (saved === 'table' || saved === 'grid') setView(saved)
    } catch {}
  }, [])
  const chooseView = (v: 'grid' | 'table') => {
    setView(v)
    try {
      localStorage.setItem('products-view', v)
    } catch {}
  }

  /** Divisions of the selected companies, grouped by company. Only companies that have divisions. */
  const divisionGroups = useMemo(
    () =>
      comps
        .map((company) => ({
          company,
          keys: uniqueSorted(products.filter((p) => p.company === company).map((p) => p.division)).map((d) => divKey(company, d)),
        }))
        .filter((g) => g.keys.length > 0),
    [comps, products],
  )

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  const filtered = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean)
    const rangeActive = priceBounds && range && (range[0] > priceBounds[0] || range[1] < priceBounds[1])
    return products
      .filter((p) => {
        if (words.length && !words.every((w) => [p.name, p.company, p.composition, p.form, p.division].some((f) => f?.toLowerCase().includes(w)))) return false
        if (cats.length && !cats.includes(p.categoryName ?? '')) return false
        if (comps.length && !comps.includes(p.company ?? '')) return false
        // Division filter applies only to companies where at least one division is ticked;
        // the other selected companies still show all their products.
        if (divSel.length && p.company && divSel.some((k) => k.startsWith(`${p.company}${SEP}`)) && !divSel.includes(divKey(p.company, p.division ?? ''))) return false
        if (formSel.length && !formSel.includes(p.form ?? '')) return false
        if (rangeActive && range) {
          const a = amountOf(p.price)
          if (a === null || a < range[0] || a > range[1]) return false
        }
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, search, cats, comps, divSel, formSel, range, priceBounds])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const current = Math.min(page, totalPages)
  const shown = filtered.slice((current - 1) * perPage, current * perPage)

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
    setPage(1)
  }
  const toggleCompany = (c: string) => {
    if (comps.includes(c)) setDivSel((d) => d.filter((k) => !k.startsWith(`${c}${SEP}`)))
    toggle(comps, setComps, c)
  }
  const reset = () => {
    setCats([])
    setComps([])
    setDivSel([])
    setFormSel([])
    setRange(priceBounds)
    setPage(1)
  }

  const filters = (mobile: boolean) => (
    <Card className={mobile ? 'mt-4 p-4 lg:hidden' : 'hidden w-64 shrink-0 self-start lg:block'}>
      {mobile ? (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Filters</h2>
          <Button variant="ghost" size="sm" aria-label="Close filters" onClick={() => setShowFilters(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
      )}
      <CardContent className={`space-y-6 ${mobile ? 'p-0' : ''}`}>
        <CheckList
          title="Categories"
          idPrefix={mobile ? 'm-cat' : 'cat'}
          values={categories}
          selected={cats}
          onToggle={(v) => toggle(cats, setCats, v)}
          onAll={() => {
            setCats([])
            setPage(1)
          }}
        />
        <CheckList
          title="Companies"
          idPrefix={mobile ? 'm-comp' : 'comp'}
          values={companies}
          selected={comps}
          counts={companyCounts}
          onToggle={toggleCompany}
          onAll={() => {
            setComps([])
            setDivSel([])
            setPage(1)
          }}
        />
        {divisionGroups.map(({ company, keys }) => (
          <div key={company} className="-mt-2 rounded-md border-l-2 border-primary bg-primary-soft/40 py-2 pl-3 pr-1">
            <CheckList
              title={divisionGroups.length > 1 || comps.length > 1 ? `Divisions of ${company}` : 'Divisions'}
              idPrefix={`${mobile ? 'm-' : ''}div-${companies.indexOf(company)}`}
              values={keys}
              selected={divSel.filter((k) => keys.includes(k))}
              counts={divisionCounts}
              labelOf={divisionOf}
              allLabel="All divisions"
              onToggle={(v) => toggle(divSel, setDivSel, v)}
              onAll={() => {
                setDivSel((d) => d.filter((k) => !keys.includes(k)))
                setPage(1)
              }}
            />
          </div>
        ))}
        <CheckList
          title="Form"
          idPrefix={mobile ? 'm-form' : 'form'}
          values={forms}
          selected={formSel}
          onToggle={(v) => toggle(formSel, setFormSel, v)}
          onAll={() => {
            setFormSel([])
            setPage(1)
          }}
        />
        {priceBounds && range && (
          <PriceRange
            min={priceBounds[0]}
            max={priceBounds[1]}
            value={range}
            onChange={(v) => {
              setRange(v)
              setPage(1)
            }}
          />
        )}
        <Button variant="outline" className="w-full" onClick={reset}>
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  )

  // Up to five page numbers around the current page, as in the reference.
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5 || current <= 3) return i + 1
    if (current >= totalPages - 2) return totalPages - 4 + i
    return current - 2 + i
  })

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h1 className="text-center text-lg font-semibold text-gray-800 sm:text-left">Explore Products</h1>
              <p className="text-center text-sm text-gray-600 sm:text-right">
              <span className="font-semibold text-gray-900">{n(products.length)}</span> products ·{' '}
              <span className="font-semibold text-gray-900">{n(companies.length)}</span> companies
              {categories.length > 0 && (
                <>
                  {' '}· <span className="font-semibold text-gray-900">{n(categories.length)}</span> categories
                </>
              )}
            </p>
          </div>
        </CardHeader>

      </Card>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {filters(false)}

        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-md sm:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="search"
                  aria-label="Search products"
                  placeholder="Search products..."
                  className={`${inputClass} pl-10`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearch(query)
                      setPage(1)
                    }
                  }}
                />
              </div>
              <Button variant="outline" className="lg:hidden" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
                <Filter className="h-4 w-4" aria-hidden />
                Filters
              </Button>
              <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                Show:
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className={`${inputClass} w-20`}
                >
                  {[25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {showFilters && filters(true)}
          </div>

          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600" role="status">
              {filtered.length === products.length ? (
                <>
                  Showing all <span className="font-semibold text-gray-900">{n(products.length)}</span> products
                </>
              ) : (
                <>
                  Found <span className="font-semibold text-gray-900">{n(filtered.length)}</span> of {n(products.length)} products
                  {comps.length === 1 && <> from {comps[0]}</>}
                </>
              )}
            </p>
            <div className="flex shrink-0 rounded-md border bg-white p-0.5" role="group" aria-label="View">
              <button
                type="button"
                aria-pressed={view === 'grid'}
                title="Cards"
                onClick={() => chooseView('grid')}
                className={cx('rounded p-1.5', view === 'grid' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900')}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                <span className="sr-only">Cards</span>
              </button>
              <button
                type="button"
                aria-pressed={view === 'table'}
                title="Table"
                onClick={() => chooseView('table')}
                className={cx('rounded p-1.5', view === 'table' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900')}
              >
                <Rows3 className="h-4 w-4" aria-hidden />
                <span className="sr-only">Table</span>
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mb-4 text-4xl" aria-hidden>
                📦
              </div>
              <p className="mb-4 text-lg text-gray-500">{products.length ? 'No products match your filters' : 'No products yet'}</p>
              {products.length > 0 && <p className="mb-4 text-sm text-gray-400">Try adjusting your search or filters</p>}
              {showRequest && (
                <Link href="/contact" className={buttonClass()}>
                  Request Product
                </Link>
              )}
            </Card>
          ) : (
            <>
              {view === 'grid' ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {shown.map((p) => (
                    <ProductCard key={p.id} product={p} options={cardOptions} />
                  ))}
                </div>
              ) : (
                <ProductTable products={shown} showPrices={hasPriceColumns} locked={lock.enabled && !lock.unlocked} onAdd={cart.enabled ? (p) => cart.add(p, 1) : undefined} />
              )}
              {totalPages > 1 && (
                <nav className="mt-8 flex justify-center" aria-label="Pages">
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" disabled={current === 1} onClick={() => setPage(current - 1)}>
                      Previous
                    </Button>
                    {pageNumbers.map((n) => (
                      <Button
                        key={n}
                        variant={n === current ? 'default' : 'outline'}
                        aria-current={n === current ? 'page' : undefined}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </Button>
                    ))}
                    <Button variant="outline" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
                      Next
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

/** Table view, like the reference's search tool: one row per product with In Box and Shipper. */
function ProductTable({
  products,
  showPrices,
  locked,
  onAdd,
}: {
  products: PublicProduct[]
  showPrices: boolean
  locked: boolean
  onAdd?: (p: PublicProduct) => void
}) {
  const cell = 'px-3 py-2 align-top'
  return (
    <Card className="overflow-hidden">
      {/* `relative` keeps hidden labels (sr-only) inside the scroll box, so the page never scrolls sideways. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className={cell}>Product</th>
              <th className={cell}>Company</th>
              <th className={cell}>Pack</th>
              {showPrices && (
                <th className={`${cell} text-right`}>
                  <span className="inline-flex items-center gap-1">
                    Price {locked && <Lock className="h-3 w-3" aria-label="locked" />}
                  </span>
                </th>
              )}
              {showPrices && <th className={`${cell} text-right`}>MRP ₹</th>}
              <th className={`${cell} text-right`}>In Box</th>
              <th className={`${cell} text-right`}>Shipper</th>
              <th className={cell}>Salt</th>
              {onAdd && <th className={cell}><span className="sr-only">Add</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => {
              const pr = p.price
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className={cell}>
                    <Link href={`/products/${p.slug}`} className="font-medium text-gray-900 hover:text-primary">
                      {p.name}
                    </Link>
                    {p.form && <span className="block text-xs text-gray-500">{p.form}</span>}
                  </td>
                  <td className={cell}>
                    {p.company}
                    {p.division && <span className="block text-xs text-gray-500">{p.division}</span>}
                  </td>
                  <td className={`${cell} whitespace-nowrap`}>{p.packSize}</td>
                  {showPrices && (
                    <td className={`${cell} whitespace-nowrap text-right font-semibold text-primary`}>
                      {pr.kind === 'amount' ? (
                        pr.locked ? <UnlockButton label="Unlock" /> : pr.price !== null ? formatINR(pr.price) : '—'
                      ) : pr.kind === 'quote' ? (
                        <PriceTag price={pr} productSlug={p.slug} />
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  {showPrices && <td className={`${cell} whitespace-nowrap text-right`}>{pr.kind === 'amount' && pr.mrp !== null ? formatINR(pr.mrp) : '—'}</td>}
                  <td className={`${cell} text-right tabular-nums`}>{p.inBox ?? '—'}</td>
                  <td className={`${cell} text-right tabular-nums`}>{p.shipper ?? '—'}</td>
                  <td className={`${cell} max-w-[260px] text-xs text-gray-600`}>
                    <span className="line-clamp-2" title={p.composition ?? ''}>
                      {p.composition}
                    </span>
                  </td>
                  {onAdd && (
                    <td className={cell}>
                      <button type="button" onClick={() => onAdd(p)} aria-label={`Add ${p.name} to cart`} title="Add to cart" className={buttonClass('outline', 'sm', 'h-8 px-2')}>
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
