/**
 * Demo data: you (super admin) + two tenants that behave differently.
 *   acme.localhost:3000    -> prices VISIBLE
 *   zenith.localhost:3000  -> prices HIDDEN
 *
 * Run once after `npm run dev` has created the tables:  npm run seed
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-now'

async function main() {
  const payload = await getPayload({ config })

  // Safe to run more than once: reuse the account if it exists and make sure it is a super admin.
  const existing = await payload.find({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } }, limit: 1 })
  if (existing.docs[0]) {
    await payload.update({ collection: 'users', id: existing.docs[0].id, data: { roles: ['super-admin'] } })
  } else {
    await payload.create({
      collection: 'users',
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, roles: ['super-admin'] },
    })
  }

  const demo = [
    { name: 'Acme Pharma', slug: 'acme', priceMode: 'visible' as const, tagline: 'Quality generics, shown with prices.' },
    { name: 'Zenith Lifecare', slug: 'zenith', priceMode: 'hidden' as const, tagline: 'Catalogue only. Prices on request.' },
  ]

  for (const d of demo) {
    const found = await payload.find({ collection: 'tenants', where: { slug: { equals: d.slug } }, limit: 1 })
    if (found.docs[0]) {
      payload.logger.info(`Tenant ${d.slug} already exists, skipping.`)
      continue
    }
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: d.name,
        slug: d.slug,
        priceMode: d.priceMode,
        profile: {
          tagline: d.tagline,
          about: 'Demo company profile. Edit me in the admin panel.',
          phone: '+91 98765 43210',
          phoneNote: 'Mon-Sat: 9AM - 7PM',
          whatsapp: '919876543210',
          email: `info@${d.slug}.example.com`,
          address: '12 Demo Road\nJaipur, Rajasthan',
          businessHours: 'Mon-Sat: 9:00 AM - 7:00 PM\nSunday: Closed',
        },
      },
    })

    const category = await payload.create({
      collection: 'categories',
      data: { tenant: tenant.id, name: 'Antibiotics', slug: 'antibiotics', sortOrder: 1 },
    })

    await payload.create({
      collection: 'products',
      data: {
        tenant: tenant.id,
        _status: 'published',
        name: 'Amoxicillin 500 mg',
        slug: 'amoxicillin-500',
        category: category.id,
        company: 'Demo Labs',
        composition: 'Amoxicillin 500 mg',
        dosageForm: 'capsule',
        packSize: '10x10 strip',
        mrp: 120,
        isFeatured: true,
      },
    })

    await payload.create({
      collection: 'users',
      data: {
        email: `owner@${d.slug}.example.com`,
        password: 'change-me-now',
        roles: ['user'],
        tenants: [{ tenant: tenant.id, role: 'owner' }],
      },
    })
  }

  // A Portal Editor, and a Tenant Editor for the first demo tenant, to try the roles.
  const firstTenant = (await payload.find({ collection: 'tenants', where: { slug: { equals: 'acme' } }, limit: 1 })).docs[0]
  const extra = [
    { email: 'editor@example.com', roles: ['portal-editor'], tenants: [] },
    ...(firstTenant ? [{ email: 'editor@acme.example.com', roles: ['user'], tenants: [{ tenant: firstTenant.id, role: 'editor' }] }] : []),
  ]
  for (const u of extra) {
    const found = await payload.find({ collection: 'users', where: { email: { equals: u.email } }, limit: 1 })
    if (!found.docs[0]) await payload.create({ collection: 'users', data: { ...u, password: 'change-me-now' } as never })
  }

  payload.logger.info('Seeded. Admin: ' + ADMIN_EMAIL)
  process.exit(0)
}

await main()
