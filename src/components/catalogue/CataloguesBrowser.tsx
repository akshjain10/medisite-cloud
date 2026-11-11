'use client'

import { Check, Download, Eye, FileText, Link2, Search, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import BrandIcon from '@/components/BrandIcon'
import { buttonClass, Card, inputClass } from '@/components/ui'
import type { PublicCatalogue } from '@/lib/catalogues'

const size = (bytes: number | null) =>
  bytes == null ? null : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** Full address of a PDF, so a shared link works outside this site. */
const absolute = (url: string) => (typeof window === 'undefined' ? url : new URL(url, window.location.origin).toString())

function ShareButtons({ cat, siteName }: { cat: PublicCatalogue; siteName: string }) {
  const [copied, setCopied] = useState(false)
  const label = `${cat.company}${cat.division ? ` – ${cat.division}` : ''} catalogue`

  const share = async () => {
    const url = absolute(cat.url)
    if (navigator.share) {
      try {
        await navigator.share({ title: label, text: `${label} from ${siteName}`, url })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    copy()
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absolute(cat.url))
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy the link')
    }
  }
  const whatsapp = () => {
    const text = `📄 ${label} from ${siteName}\n${absolute(cat.url)}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={whatsapp} title="Share on WhatsApp" aria-label={`Share ${label} on WhatsApp`} className={buttonClass('whatsappOutline', 'icon')}>
        <BrandIcon name="whatsapp" className="h-4 w-4" />
      </button>
      <button type="button" onClick={copy} title="Copy link" aria-label={`Copy link to ${label}`} className={buttonClass('outline', 'icon')}>
        {copied ? <Check className="h-4 w-4 text-green-600" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
      </button>
      <button type="button" onClick={share} title="Share" aria-label={`Share ${label}`} className={buttonClass('outline', 'icon')}>
        <Share2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

/** Company-wise PDF catalogue cards with search, in the style of the reference's catalogues page. */
export default function CataloguesBrowser({ catalogues, siteName, productCompanies }: { catalogues: PublicCatalogue[]; siteName: string; productCompanies: string[] }) {
  const [query, setQuery] = useState('')
  const companies = useMemo(() => Array.from(new Set(catalogues.map((c) => c.company))), [catalogues])
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = catalogues.filter((c) => words.every((w) => [c.company, c.division, c.title, c.description].some((f) => f?.toLowerCase().includes(w))))
  const groups = companies.map((company) => ({ company, items: shown.filter((c) => c.company === company) })).filter((g) => g.items.length)
  const hasProducts = new Set(productCompanies.map((c) => c.toLowerCase()))

  return (
    <>
      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Catalogues</h1>
            <p className="mt-1 text-gray-600">
              <span className="font-semibold text-gray-900">{catalogues.length}</span> {catalogues.length === 1 ? 'catalogue' : 'catalogues'} from{' '}
              <span className="font-semibold text-gray-900">{companies.length}</span> {companies.length === 1 ? 'company' : 'companies'}. View in your browser, download, or share.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              aria-label="Search catalogues"
              placeholder="Search company or division..."
              className={`${inputClass} pl-10`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {groups.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">No catalogues match your search.</Card>
      ) : (
        <div className="space-y-10">
          {groups.map(({ company, items }) => (
            <section key={company} aria-labelledby={`co-${company}`}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                <h2 id={`co-${company}`} className="text-xl font-semibold">
                  {company} <span className="text-sm font-normal text-gray-500">({items.length})</span>
                </h2>
                {hasProducts.has(company.toLowerCase()) && (
                  <Link href={`/products?company=${encodeURIComponent(company)}`} className="text-sm font-medium text-primary hover:underline">
                    Browse {company} products →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((cat) => (
                  <Card key={cat.id} className="flex flex-col p-5">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                        <FileText className="h-6 w-6" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{cat.company}</p>
                        <h3 className="font-semibold leading-snug [overflow-wrap:anywhere]">{cat.title}</h3>
                      </div>
                    </div>
                    {cat.description && <p className="mb-3 text-sm text-gray-600">{cat.description}</p>}
                    <div className="mb-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-700">PDF</span>
                      {size(cat.size) && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-700">{size(cat.size)}</span>}
                      {cat.updatedLabel && <span className="rounded-full bg-green-50 px-2.5 py-0.5 font-medium text-green-700">Updated {cat.updatedLabel}</span>}
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <a href={cat.url} target="_blank" rel="noopener noreferrer" className={buttonClass('default', 'default', 'flex-1')}>
                        <Eye className="h-4 w-4" aria-hidden />
                        View PDF
                      </a>
                      <a href={cat.url} download={cat.filename} title="Download PDF" aria-label={`Download ${cat.title}`} className={buttonClass('outline', 'icon')}>
                        <Download className="h-4 w-4" aria-hidden />
                      </a>
                      <ShareButtons cat={cat} siteName={siteName} />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
