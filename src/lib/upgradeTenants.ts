import type { Payload } from 'payload'

/**
 * Brings clients saved before the home page restyle up to date. Runs automatically when the
 * app starts (see onInit in payload.config.ts) and can also be run by hand: npm run upgrade-tenants
 *
 * - A client still on the old default section list gets the new default list, and empty
 *   "Why choose us" / "How to order" content gets neutral starter text.
 * - Every other client is left exactly as it is.
 * Safe to run any number of times: an up-to-date client is not touched.
 */
const OLD_SECTIONS = ['hero', 'about', 'products', 'certifications', 'contact']
export const NEW_SECTIONS = ['hero', 'stats', 'explore', 'features', 'products', 'brands', 'howToOrder', 'contact']

/** Bump when adding a one-time upgrade below; stored per client in the hidden `upgradeLevel` field. */
export const LATEST_LEVEL = 1

const FEATURES = [
  { icon: '🚚', title: 'Fast Delivery', description: 'Quick and reliable delivery across the region.' },
  { icon: '✅', title: 'Quality Products', description: 'Genuine products sourced from trusted manufacturers.' },
  { icon: '💬', title: 'Responsive Support', description: 'Our team is ready to help with your queries.' },
]
const STEPS = [
  { title: 'Browse Products', description: 'Explore our range of products.' },
  { title: 'Send an Enquiry', description: 'Tell us what you need using the enquiry form or WhatsApp.' },
  { title: 'Confirmation', description: 'Our team confirms availability and details with you.' },
  { title: 'Delivery', description: 'Make payment and receive your order.' },
]

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

export async function upgradeTenants(payload: Payload): Promise<void> {
  const { docs } = await payload.find({
    collection: 'tenants',
    limit: 1000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  for (const t of docs) {
    const sections = (t.sections ?? []) as string[]

    // Level 1 (Nov 2026): add the new "Counts" and "Explore cards" sections right after the hero,
    // once. A client who removes them afterwards keeps them removed.
    if ((t.upgradeLevel ?? 0) < LATEST_LEVEL && sections.length && !sameSet(sections, OLD_SECTIONS)) {
      const next = sections.filter((s) => s !== 'stats' && s !== 'explore')
      const at = next.indexOf('hero') + 1
      next.splice(at, 0, 'stats', 'explore')
      try {
        await payload.update({ collection: 'tenants', id: t.id, data: { sections: next, upgradeLevel: LATEST_LEVEL } as never, overrideAccess: true })
        payload.logger.info(`Upgraded client "${t.slug}": added "Counts" and "Explore cards" to the home page`)
      } catch (err) {
        payload.logger.warn({ err, msg: `Could not upgrade client "${t.slug}"; it will be retried on the next start` })
      }
      continue
    }

    // Only clients still on the old default list are upgraded. Anyone already on the new list,
    // or with a customised list, is left exactly as they are, so a client who deliberately
    // removed their cards does not get them back on the next restart.
    if (!(sections.length === 0 || sameSet(sections, OLD_SECTIONS))) continue

    const changes: string[] = ['home page sections']
    const home = { ...(t.home ?? {}) } as Record<string, unknown>
    if (!t.home?.features?.length) {
      home.features = FEATURES
      changes.push('"Why choose us" cards')
    }
    if (!t.home?.steps?.length) {
      home.steps = STEPS
      changes.push('"How to order" steps')
    }
    const data: Record<string, unknown> = { sections: NEW_SECTIONS, home, upgradeLevel: LATEST_LEVEL }

    if (changes.length) {
      await payload.update({ collection: 'tenants', id: t.id, data: data as never, overrideAccess: true })
      payload.logger.info(`Upgraded client "${t.slug}": added ${changes.join(', ')}`)
    }
  }
}
