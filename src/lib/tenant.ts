import { headers } from 'next/headers'
import { cache } from 'react'

import type { Tenant } from '@/payload-types'

import { getPayloadClient } from './payload'
import { pricesUnlocked } from './priceLock'

/**
 * The tenant as the public site uses it. The price password is removed (it is never needed to
 * render a page), and `priceUnlocked` says whether this visitor may see locked prices.
 */
export type SiteTenant = Omit<Tenant, 'pricePassword'> & {
  pricePassword?: never
  priceUnlocked?: boolean
  /** 'login': a dashboard user signed in at this address, so "Lock prices" would not apply. */
  priceUnlockedBy?: 'password' | 'login'
}

/**
 * Works out which client website is being requested from the Host header.
 *
 *   arihantmedigens.com        -> tenant whose `domain` is arihantmedigens.com
 *   acme.<PLATFORM_DOMAIN>     -> tenant whose `slug` is acme (previews, and dev via acme.localhost:3000)
 *
 * Returns null on the bare platform domain or an unknown host.
 * Wrapped in React `cache` so the lookup runs once per request.
 */
export const getCurrentTenant = cache(async (): Promise<SiteTenant | null> => {
  const rawHost = (await headers()).get('host') ?? ''
  const host = rawHost.split(':')[0].toLowerCase().replace(/^www\./, '')
  const platform = (process.env.PLATFORM_DOMAIN ?? 'localhost').toLowerCase()
  const sub = host.endsWith(`.${platform}`) ? host.slice(0, -(platform.length + 1)) : null

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'tenants',
    where: sub ? { or: [{ domain: { equals: host } }, { slug: { equals: sub } }] } : { domain: { equals: host } },
    limit: 1,
    depth: 1,
    pagination: false,
  })
  const doc = docs[0]
  if (!doc) return null
  const { pricePassword: _secret, ...tenant } = doc
  const by = doc.priceMode === 'locked' ? await pricesUnlocked(doc) : false
  return { ...tenant, priceUnlocked: Boolean(by), priceUnlockedBy: by || undefined }
})
