import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import OrderClient from '@/components/cart/OrderClient'
import { PageShell } from '@/components/PageShell'
import { getCatalogue } from '@/lib/products'
import { siteConfig } from '@/lib/site'
import { getCurrentTenant } from '@/lib/tenant'

export const metadata: Metadata = { title: 'Order' }

export default async function OrderPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null
  const site = siteConfig(tenant)
  if (!site.cartEnabled) notFound()

  return (
    <PageShell>
      <OrderClient products={await getCatalogue(tenant)} whatsapp={site.whatsapp} />
    </PageShell>
  )
}
