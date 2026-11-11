import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeDeleteHook, type CollectionConfig, type PayloadRequest, type Where } from 'payload'

import {
  idOf,
  isPortalEditor,
  isPortalOwner,
  isPortalUser,
  loggedIn,
  tenantIdsFor,
} from '../access'

/** True only before the very first account exists (Payload's "create first user" screen). */
const noUsersYet = async (req: PayloadRequest): Promise<boolean> => {
  const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true })
  return totalDocs === 0
}

type Row = { tenant?: number | { id: number } | null; role?: string | null }
const rowKey = (r: Row) => `${idOf(r.tenant)}:${r.role ?? 'editor'}`
const PORTAL_ROLES = ['super-admin', 'portal-editor']

const forbidden = (message: string) => new APIError(message, 403, undefined, true)

/**
 * Who may create or change which user. Field access already stops non-owners from editing
 * `roles`; this hook enforces the rules that depend on both the editor and the edited user.
 */
const guardUserChanges: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const actor = req.user
  // Scripts, the seed and the very first sign-up run without a logged-in user.
  if (!actor || isPortalOwner(actor)) return data

  const targetRoles: string[] = (originalDoc?.roles ?? []) as string[]
  const isSelf = operation === 'update' && originalDoc?.id === actor.id

  if (isPortalEditor(actor)) {
    if (operation === 'update' && !isSelf && targetRoles.includes('super-admin'))
      throw forbidden('Portal Editors cannot change a Portal Super Owner account.')
    return data
  }

  // ---- Tenant users ----
  if (operation === 'update' && targetRoles.some((r) => PORTAL_ROLES.includes(r)) && !isSelf)
    throw forbidden('Only portal staff can change portal accounts.')

  const owned = new Set(tenantIdsFor(actor, ['owner']))
  const before: Row[] = (originalDoc?.tenants ?? []) as Row[]
  const after: Row[] = (data.tenants ?? before) as Row[]

  // Rows for tenants this person does not own must stay exactly as they were.
  const foreign = (rows: Row[]) => rows.filter((r) => !owned.has(idOf(r.tenant) ?? -1)).map(rowKey).sort().join('|')
  if (foreign(before) !== foreign(after))
    throw forbidden('You can only give access to tenants where you are the Tenant Super Owner.')

  if (operation === 'create') {
    if (!after.length) throw forbidden('Choose the tenant this user belongs to.')
    data.roles = ['user'] // tenant owners never create portal accounts
  } else if (!isSelf) {
    // Managing someone else: every tenant they belong to must be one you own.
    if (before.some((r) => !owned.has(idOf(r.tenant) ?? -1)))
      throw forbidden('This user also belongs to another tenant, so only portal staff can change them.')
  }
  return data
}

const guardUserDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const actor = req.user
  if (!actor) return
  if (actor.id === id) throw forbidden('You cannot delete your own account.')
  if (isPortalOwner(actor)) return
  const target = await req.payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true })
  const owned = new Set(tenantIdsFor(actor, ['owner']))
  const rows = (target.tenants ?? []) as Row[]
  if (((target.roles ?? []) as string[]).some((r) => PORTAL_ROLES.includes(r)) || !rows.length || rows.some((r) => !owned.has(idOf(r.tenant) ?? -1)))
    throw forbidden('You can only delete users who belong only to tenants you own.')
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'roles', 'tenants'] },
  access: {
    admin: ({ req }) => Boolean(req.user),
    // Portal Super Owner: anyone. Tenant Super Owner: users for their own tenants (checked in the
    // hook). Portal Editors may not add users.
    create: ({ req }) =>
      isPortalOwner(req.user) || (!isPortalEditor(req.user) && tenantIdsFor(req.user, ['owner']).length > 0),
    delete: ({ req }) => {
      if (isPortalOwner(req.user)) return true
      const owned = tenantIdsFor(req.user, ['owner'])
      return owned.length ? { 'tenants.tenant': { in: owned } } : false
    },
    read: loggedIn, // the multi-tenant plugin narrows this to users who share a tenant
    update: ({ req }) => {
      if (isPortalUser(req.user)) return true
      const self: Where = { id: { equals: req.user?.id } }
      const owned = tenantIdsFor(req.user, ['owner'])
      return owned.length ? { or: [self, { 'tenants.tenant': { in: owned } }] } : self
    },
  },
  hooks: { beforeChange: [guardUserChanges], beforeDelete: [guardUserDelete] },
  fields: [
    {
      name: 'roles',
      label: 'Portal role',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Portal Super Owner (everything)', value: 'super-admin' },
        { label: 'Portal Editor (all tenants; cannot add or delete users or tenants)', value: 'portal-editor' },
        { label: 'Tenant user (access set per tenant below)', value: 'user' },
      ],
      // The very first account on a fresh install becomes the Portal Super Owner.
      // Everyone after that defaults to a tenant user.
      defaultValue: async ({ req }) => ((await noUsersYet(req)) ? ['super-admin'] : ['user']),
      saveToJWT: true,
      admin: {
        description: 'Tenant users get their access from the Tenants list below: Tenant Super Owner or Tenant Editor.',
        condition: (_d, _s, { user }) => isPortalUser(user),
      },
      access: {
        create: async ({ req }) => isPortalOwner(req.user) || (await noUsersYet(req)),
        update: ({ req }) => isPortalOwner(req.user),
      },
    },
    // The multi-tenant plugin adds the `tenants` array here (which tenants + Tenant role).
  ],
}
