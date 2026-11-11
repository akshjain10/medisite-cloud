import type { Metadata } from 'next'

import ProductsBrowser from '@/components/catalogue/ProductsBrowser'
import { PageShell } from '@/components/PageShell'
import { getCatalogue } from '@/lib/products'
import { siteConfig } from '@/lib/site'
import { getCurrentTenant } from '@/lib/tenant'

export const metadata: Metadata = { title: 'Products' }

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; company?: string }> }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return null
  const site = siteConfig(tenant)
  const { category, company } = await searchParams

  return (
    <PageShell>
      <ProductsBrowser
        products={await getCatalogue(tenant)}
        initialCategory={category ?? null}
        initialCompany={company ?? null}
        perPage={site.catalogue.perPage}
        cardOptions={{ showCompany: site.catalogue.showCompany, showPacking: site.catalogue.showPacking }}
        showRequest={site.showEnquiry}
      />
    </PageShell>
  )
}
