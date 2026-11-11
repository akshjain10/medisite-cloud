import { Pill } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import BackButton from '@/components/catalogue/BackButton'
import ProductActions from '@/components/catalogue/ProductActions'
import ShareMenu from '@/components/catalogue/ShareMenu'
import { PageShell } from '@/components/PageShell'
import { ProductCard } from '@/components/ProductCard'
import { Badge, Card } from '@/components/ui'
import { formatINR } from '@/lib/format'
import { amountOf, getPublicProduct, getSimilarProducts, type PublicProduct } from '@/lib/products'
import { siteConfig } from '@/lib/site'
import { getCurrentTenant } from '@/lib/tenant'

type Params = { params: Promise<{ slug: string }> }

/** Product summary for sharing and WhatsApp. Only includes the MRP when it is public. */
function summary(p: PublicProduct, heading: string) {
  const lines = [heading]
  if (p.company) lines.push(`🏢 Company: ${p.company}`)
  if (p.price.kind === 'amount' && p.price.mrp !== null) lines.push(`💰 MRP: ${formatINR(p.price.mrp)}`)
  if (p.price.kind === 'amount' && p.price.price !== null) lines.push(`🏷️ Price: ${formatINR(p.price.price)}`)
  if (p.categoryName) lines.push(`🏷️ Category: ${p.categoryName}`)
  if (p.packSize) lines.push(`📋 Packing: ${p.packSize}`)
  if (p.form) lines.push(`💊 Form: ${p.form}`)
  if (p.inBox) lines.push(`📦 In Box: ${p.inBox}`)
  if (p.shipper) lines.push(`🚚 Shipper: ${p.shipper}`)
  if (p.composition) lines.push(`🧪 Salt: ${p.composition}`)
  return lines.join('\n')
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tenant = await getCurrentTenant()
  if (!tenant) return {}
  const product = await getPublicProduct(tenant, (await params).slug)
  if (!product) return { title: 'Product not found' }
  const by = product.company ? ` by ${product.company}` : ''
  const description = [product.composition, product.packSize, amountOf(product.price) !== null ? formatINR(amountOf(product.price) as number) : null]
    .filter(Boolean)
    .join(' · ')
  return {
    title: `${product.name}${by}`,
    description: description || undefined,
    openGraph: {
      title: `${product.name}${by}`,
      description: description || undefined,
      images: product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : undefined,
      type: 'website',
      siteName: tenant.name,
    },
  }
}

export default async function ProductPage({ params }: Params) {
  const tenant = await getCurrentTenant()
  if (!tenant) return null
  const site = siteConfig(tenant)
  const product = await getPublicProduct(tenant, (await params).slug)
  if (!product) notFound()

  const similar = site.catalogue.showSimilar ? await getSimilarProducts(tenant, product) : []
  // Only say "with <salt>" when the list really contains products with the same salt.
  const saltKey = (v: string | null) => (v ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  const sameSalt = Boolean(product.composition) && similar.some((p) => saltKey(p.composition) === saltKey(product.composition))
  const cardOptions = { showCompany: site.catalogue.showCompany, showPacking: site.catalogue.showPacking }

  const details: [string, string | null][] = [
    ['Name', product.name],
    ['Company', product.company],
    ['Packing', product.packSize],
    ['Salt', product.composition],
    ['Form', product.form ? product.form[0].toUpperCase() + product.form.slice(1) : null],
    ['Division', product.division],
    ['In Box', product.inBox],
    ['Shipper', product.shipper],
  ]

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between">
        <BackButton />
        {site.catalogue.showShare && <ShareMenu title={product.name} details={summary(product, `🏥 *${product.name}*`)} />}
      </div>

      <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {product.categoryName && <Badge>{product.categoryName}</Badge>}
          <div className="mx-auto flex min-h-[400px] max-w-lg items-center justify-center overflow-hidden rounded-lg bg-white p-8">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="max-h-full max-w-full rounded object-contain" />
            ) : (
              <Pill className="h-24 w-24 text-gray-200" aria-hidden />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 lg:text-3xl">{product.name}</h1>
            {product.company && <p className="mb-4 text-lg text-gray-600">{product.company}</p>}
            <div className="mb-4 flex flex-wrap gap-2">
              {product.categoryName && <Badge>{product.categoryName}</Badge>}
              {product.composition && <Badge variant="outline">{product.composition}</Badge>}
            </div>
          </div>

          <Card className="p-6">
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[3fr_1fr]">
              <div>
                <h2 className="mb-2 font-semibold text-gray-700">Product Details</h2>
                <dl className="space-y-2 text-sm">
                  {details.map(([label, value]) =>
                    value ? (
                      <div key={label}>
                        <dt className="inline font-medium">{label}:</dt> <dd className="inline">{value}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              </div>
              <ProductActions
                product={product}
                whatsapp={site.whatsapp}
                showEnquiry={site.showEnquiry}
                enquiryText={summary(product, `🔍 Product Enquiry\n\n📦 Product: ${product.name}`)}
              />
            </div>
          </Card>

          {product.description && <p className="whitespace-pre-line leading-relaxed text-gray-700">{product.description}</p>}
        </div>
      </div>

      {similar.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-bold">
            {sameSalt ? `Similar Products with ${product.composition}` : product.categoryName ? `More in ${product.categoryName}` : 'Similar Products'}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} options={cardOptions} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}
