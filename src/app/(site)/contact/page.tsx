import type { Metadata } from 'next'

import ContactBlock from '@/components/ContactBlock'
import { PageShell } from '@/components/PageShell'
import { getPublicProduct } from '@/lib/products'
import { getCurrentTenant } from '@/lib/tenant'

export const metadata: Metadata = { title: 'Contact' }

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return null
  const { product: slug } = await searchParams
  const product = slug ? await getPublicProduct(tenant, slug) : null

  return (
    <PageShell>
      <ContactBlock tenant={tenant} product={product} asPageTitle />
    </PageShell>
  )
}
