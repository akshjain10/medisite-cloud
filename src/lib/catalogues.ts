import type { Media } from '@/payload-types'

import { getPayloadClient } from './payload'
import type { SiteTenant } from './tenant'

export type PublicCatalogue = {
  id: number
  company: string
  division: string | null
  title: string
  description: string | null
  updatedLabel: string | null
  url: string
  filename: string
  /** File size in bytes, when known. */
  size: number | null
}

/** Visible PDF catalogues of this site, grouped later by company. Empty when the feature is off. */
export async function getCatalogues(tenant: SiteTenant): Promise<PublicCatalogue[]> {
  if (tenant.showCatalogues === false) return []
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'catalogues',
    where: {
      and: [{ tenant: { equals: tenant.id } }, { or: [{ visible: { equals: true } }, { visible: { exists: false } }] }],
    },
    sort: ['sortOrder', 'company', 'title'],
    depth: 1,
    limit: 500,
    overrideAccess: true,
  })
  return docs.flatMap((d) => {
    const file = typeof d.file === 'object' ? (d.file as Media | null) : null
    if (!file?.url) return []
    return [
      {
        id: d.id,
        company: d.company,
        division: d.division ?? null,
        title: d.title || d.division || d.company,
        description: d.description ?? null,
        updatedLabel: d.updatedLabel ?? null,
        url: file.url,
        filename: file.filename ?? `${d.title || d.company}.pdf`,
        size: file.filesize ?? null,
      },
    ]
  })
}

/** For the menu link and home page card: is there anything to show? */
export async function hasCatalogues(tenant: SiteTenant): Promise<boolean> {
  if (tenant.showCatalogues === false) return false
  const payload = await getPayloadClient()
  const { totalDocs } = await payload.count({
    collection: 'catalogues',
    where: { and: [{ tenant: { equals: tenant.id } }, { or: [{ visible: { equals: true } }, { visible: { exists: false } }] }] },
    overrideAccess: true,
  })
  return totalDocs > 0
}
