'use server'

import { cookies, headers } from 'next/headers'

import { getPayloadClient } from '@/lib/payload'
import {
  clearFailures,
  recordFailure,
  sameText,
  tooManyAttempts,
  UNLOCK_COOKIE,
  UNLOCK_DAYS,
  unlockToken,
  userCanSeePrices,
} from '@/lib/priceLock'
import { getCurrentTenant } from '@/lib/tenant'

export type UnlockState = { status: 'idle' } | { status: 'error'; message: string } | { status: 'unlocked' }

const text = (v: FormDataEntryValue | null, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

async function visitorKey(tenantId: number) {
  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'local'
  return `${tenantId}:${ip}`
}

/**
 * "Unlock prices" window on the public site. Accepts either the site's price password, or the
 * email and password of a dashboard user who belongs to this site (or portal staff).
 */
export async function unlockPrices(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const tenant = await getCurrentTenant()
  if (!tenant || tenant.priceMode !== 'locked') return { status: 'error', message: 'Prices are not locked on this website.' }

  const key = await visitorKey(tenant.id)
  if (tooManyAttempts(key)) return { status: 'error', message: 'Too many wrong tries. Please wait 15 minutes and try again.' }

  // The public tenant object never carries the password, so read it here, on the server only.
  const payload = await getPayloadClient()
  const full = await payload.findByID({ collection: 'tenants', id: tenant.id, depth: 0, overrideAccess: true, select: { pricePassword: true } })
  const password = full.pricePassword?.trim()
  if (!password) return { status: 'error', message: 'This website has not set a price password yet.' }

  const mode = text(formData.get('mode'))
  let ok = false
  if (mode === 'login') {
    const email = text(formData.get('email'))
    const userPassword = text(formData.get('password'), 500)
    if (!email || !userPassword) return { status: 'error', message: 'Enter your email and password.' }
    try {
      // Checks the dashboard login only; no dashboard session is started here.
      const { user } = await payload.login({ collection: 'users', data: { email, password: userPassword } })
      ok = userCanSeePrices(user, tenant.id)
      if (!ok) {
        recordFailure(key)
        return { status: 'error', message: 'This account does not have access to this website.' }
      }
    } catch {
      ok = false
    }
  } else {
    ok = sameText(text(formData.get('password'), 500), password)
  }

  if (!ok) {
    recordFailure(key)
    return { status: 'error', message: mode === 'login' ? 'Email or password is incorrect.' : 'That password is not correct.' }
  }

  clearFailures(key)
  ;(await cookies()).set(UNLOCK_COOKIE, unlockToken(tenant.id, password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: UNLOCK_DAYS * 24 * 60 * 60,
  })
  return { status: 'unlocked' }
}

/** "Lock prices again" on this browser. */
export async function lockPrices(): Promise<void> {
  ;(await cookies()).delete(UNLOCK_COOKIE)
}
