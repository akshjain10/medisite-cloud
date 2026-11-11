import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { isPortalUser, tenantIdsFor } from './access'
import { Catalogues } from './collections/Catalogues'
import { Categories } from './collections/Categories'
import { Enquiries } from './collections/Enquiries'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Products } from './collections/Products'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { upgradeTenants } from './lib/upgradeTenants'
import { withAdminDefaults } from './fields/adminDefaults'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      // Who is logged in, their role, and a Log out button, at the top right of every page.
      actions: ['/components/admin/UserMenu#default'],
      // "Import products" in the side menu, and the page it opens.
      afterNavLinks: ['/components/admin/ImportNavLink#default'],
      // Open the Dashboard after every login, instead of the page you were on before.
      providers: ['/components/admin/DashboardAfterLogin#default'],
      views: {
        importProducts: { Component: '/components/admin/ImportView#default', path: '/import-products' },
      },
    },
  },
  collections: [Users, Tenants, Media, Categories, Products, Catalogues, Orders, Enquiries].map(withAdminDefaults),
  // Upgrade clients saved by an older version, so new home page sections appear without manual steps.
  // A failure here is logged and never stops the app from starting.
  onInit: async (payload) => {
    try {
      await upgradeTenants(payload)
    } catch (err) {
      payload.logger.error({ err, msg: 'Client upgrade check failed' })
    }
  },
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    // In development Payload syncs the schema automatically.
    // Before going live, switch to migrations: `payload migrate:create` / `payload migrate`.
  }),
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  plugins: [
    multiTenantPlugin({
      // Every collection listed here gets a `tenant` field and automatic per-tenant access filtering.
      collections: {
        media: {},
        categories: {},
        products: {},
        catalogues: {},
        orders: {},
        enquiries: {},
      },
      tenantsSlug: 'tenants',
      // Without this, the "Filter by Tenant" dropdown in the admin also filters the Tenants list itself,
      // so picking one tenant makes the others seem to disappear. Access rules still apply: a client
      // user only ever sees their own tenant.
      useTenantsListFilter: false,
      // Portal Super Owners and Portal Editors work across every tenant; everyone else is limited
      // to the tenants listed on their user account.
      userHasAccessToAllTenants: (user) => isPortalUser(user),
      tenantsArrayField: {
        includeDefaultField: true,
        // Who may change a user's tenant list. Tenant Super Owners may, but only for their own
        // tenants (enforced in the Users collection hook); Tenant Editors may not.
        arrayFieldAccess: {
          create: ({ req }) => isPortalUser(req.user) || tenantIdsFor(req.user, ['owner']).length > 0,
          update: ({ req }) => isPortalUser(req.user) || tenantIdsFor(req.user, ['owner']).length > 0,
        },
        rowFields: [
          {
            name: 'role',
            type: 'select',
            defaultValue: 'editor',
            required: true,
            options: [
              { label: 'Tenant Super Owner (everything for this tenant)', value: 'owner' },
              { label: 'Tenant Editor (cannot add or delete users or products)', value: 'editor' },
            ],
          },
        ],
      },
    }),
  ],
})
