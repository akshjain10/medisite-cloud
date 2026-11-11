import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { canManageTenant, isPortalUser, tenantIdsFor } from '@/access'

import ImportClient from './ImportClient'

/** Admin page at /admin/import-products. */
export default async function ImportView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale, cookies } = initPageResult
  const user = req.user
  if (!user) redirect(`${req.payload.config.routes.admin}/login`)

  const ids = tenantIdsFor(user)
  const { docs } = await req.payload.find({
    collection: 'tenants',
    depth: 0,
    pagination: false,
    sort: 'name',
    overrideAccess: true,
    select: { name: true },
    where: isPortalUser(user) ? undefined : { id: { in: ids.length ? ids : [-1] } },
  })
  const tenants = docs.map((t) => ({ id: t.id, name: t.name, canCreate: canManageTenant(user, t.id) }))
  const fromCookie = Number(cookies.get('payload-tenant'))
  const initialTenant = tenants.find((t) => t.id === fromCookie)?.id ?? tenants[0]?.id ?? null

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      // Custom pages must pass the header buttons themselves (the user menu with Log out).
      viewActions={req.payload.config.admin.components?.actions}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <ImportClient tenants={tenants} initialTenant={initialTenant} apiRoute={req.payload.config.routes.api} />
      </Gutter>
    </DefaultTemplate>
  )
}
