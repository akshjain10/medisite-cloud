import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import CataloguesBrowser from '@/components/catalogue/CataloguesBrowser'
import { PageShell } from '@/components/PageShell'
import { getCatalogues } from '@/lib/catalogues'
import { getCatalogue } from '@/lib/products'
import { getCurrentTenant } from '@/lib/tenant'

export const metadata: Metadata = { title: 'Catalogues', description: 'Company-wise PDF product catalogues to view, download and share.' }

export default async function CataloguesPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null
  // Switched off in Site options, or nothing uploaded yet.
  const catalogues = await getCatalogues(tenant)
  if (!catalogues.length) notFound()
  const products = await getCatalogue(tenant)
  const productCompanies = Array.from(new Set(products.map((p) => p.company).filter((c): c is string => Boolean(c))))

  return (
    <PageShell>
      <CataloguesBrowser catalogues={catalogues} siteName={tenant.name} productCompanies={productCompanies} />
    </PageShell>
  )
}
