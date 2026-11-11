import { createHmac, timingSafeEqual } from 'crypto'

import { cookies, headers } from 'next/headers'

import { isPortalUser, tenantIdsFor } from '@/access'
import type { Tenant } from '@/payload-types'

import { getPayloadClient } from './payload'

/**
 * PRICE LOCK ("Lock prices" in a client's Site options)
 *
 * Visitors see prices only after typing the client's price password. Unlocking sets an httpOnly
 * cookie holding a signature of (tenant id + current password), so:
 *  - the cookie cannot be forged without PAYLOAD_SECRET,
 *  - changing the password in the dashboard locks everyone out again.
 * People logged in to the dashboard with access to this site always see prices, either through
 * their dashboard login cookie (same address) or by logging in from the unlock window.
 */

export const UNLOCK_COOKIE = 'price_unlock'
export const UNLOCK_DAYS = 30

const secret = () => process.env.PAYLOAD_SECRET || 'missing-secret'

export const unlockToken = (tenantId: number, password: string) =>
  createHmac('sha256', secret()).update(`price-unlock:${tenantId}:${password}`).digest('base64url')

/** Constant-time comparison of two strings. */
export function sameText(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** May this dashboard user see this site's prices? Portal staff and the site's own users. */
export const userCanSeePrices = (user: unknown, tenantId: number) =>
  Boolean(user) && (isPortalUser(user as never) || tenantIdsFor(user).includes(tenantId))

/** How the visitor of this request unlocked prices on this site, or false. Server-only. */
export async function pricesUnlocked(tenant: Pick<Tenant, 'id' | 'pricePassword'>): Promise<'password' | 'login' | false> {
  const password = tenant.pricePassword?.trim()
  const cookie = (await cookies()).get(UNLOCK_COOKIE)?.value
  if (password && cookie && sameText(cookie, unlockToken(tenant.id, password))) return 'password'

  // Logged in to the dashboard at this same address? (payload-token cookie)
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: await headers() })
    return userCanSeePrices(user, tenant.id) ? 'login' : false
  } catch {
    return false
  }
}

/* ---- Simple brute-force protection: 10 wrong tries per visitor per 15 minutes ---- */

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS = 10
type Attempts = Map<string, { fails: number; since: number }>
const attempts = (): Attempts => {
  const g = globalThis as unknown as { __priceUnlockAttempts?: Attempts }
  return (g.__priceUnlockAttempts ??= new Map())
}

export function tooManyAttempts(key: string) {
  const a = attempts().get(key)
  if (!a || Date.now() - a.since > WINDOW_MS) return false
  return a.fails >= MAX_FAILS
}
export function recordFailure(key: string) {
  const map = attempts()
  const a = map.get(key)
  if (!a || Date.now() - a.since > WINDOW_MS) map.set(key, { fails: 1, since: Date.now() })
  else a.fails++
  if (map.size > 5000) map.clear() // keep memory bounded
}
export const clearFailures = (key: string) => attempts().delete(key)
