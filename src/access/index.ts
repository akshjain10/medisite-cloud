import type { Access, FieldAccess, TypedUser, Where } from 'payload'

/**
 * The four kinds of admin user
 * ----------------------------
 * Portal roles live in `user.roles`; tenant roles live in each row of `user.tenants`
 * (one row per client site the user belongs to).
 *
 *  1. Portal Super Owner  roles: ['super-admin']    everything, every tenant
 *  2. Portal Editor       roles: ['portal-editor']  like 1, but cannot add or delete users or tenants
 *  3. Tenant Super Owner  tenants[].role 'owner'    all settings and content of their own tenant(s)
 *  4. Tenant Editor       tenants[].role 'editor'   like 3, but cannot add or delete users or products
 *
 * Tenant users never see other tenants: the multi-tenant plugin adds a tenant filter to every
 * query they make (see userHasAccessToAllTenants in payload.config.ts).
 */

export type TenantRole = 'owner' | 'editor'

type MaybeUser = TypedUser | null | undefined
type Membership = { tenant?: number | { id: number } | null; role?: string | null }

const rolesOf = (user: MaybeUser): string[] => ((user as { roles?: string[] } | null | undefined)?.roles ?? []) as string[]
const membershipsOf = (user: unknown): Membership[] =>
  ((user as { tenants?: Membership[] } | null | undefined)?.tenants ?? []) as Membership[]

export const idOf = (v: number | { id: number } | null | undefined): number | null =>
  v == null ? null : typeof v === 'object' ? v.id : v

export const isPortalOwner = (user: MaybeUser) => rolesOf(user).includes('super-admin')
export const isPortalEditor = (user: MaybeUser) => rolesOf(user).includes('portal-editor')
/** Portal Super Owner or Portal Editor: sees and edits every tenant. */
export const isPortalUser = (user: MaybeUser) => isPortalOwner(user) || isPortalEditor(user)

/** Kept for older imports: "super admin" is the Portal Super Owner. */
export const isSuperAdmin = isPortalOwner

/** Tenant ids where this user has one of the given tenant roles. */
export function tenantIdsFor(user: unknown, roles: TenantRole[] = ['owner', 'editor']): number[] {
  return membershipsOf(user)
    .filter((m) => roles.includes((m.role ?? 'editor') as TenantRole))
    .map((m) => idOf(m.tenant))
    .filter((id): id is number => id != null)
}

export const tenantRole = (user: unknown, tenantId: number | null): TenantRole | null => {
  const row = membershipsOf(user).find((m) => idOf(m.tenant) === tenantId)
  return row ? ((row.role ?? 'editor') as TenantRole) : null
}

/** Can this user add or delete products (and users) in the given tenant? */
export const canManageTenant = (user: MaybeUser, tenantId: number | null) =>
  isPortalUser(user) || (tenantId != null && tenantRole(user, tenantId) === 'owner')

/** Readable role name for the admin header. */
export function roleLabel(user: MaybeUser): string {
  if (isPortalOwner(user)) return 'Portal Super Owner'
  if (isPortalEditor(user)) return 'Portal Editor'
  if (tenantIdsFor(user, ['owner']).length) return 'Tenant Super Owner'
  if (tenantIdsFor(user, ['editor']).length) return 'Tenant Editor'
  return 'No access yet'
}

// ---- Ready-made access functions ----------------------------------------------------------

export const loggedIn: Access = ({ req }) => Boolean(req.user)
export const nobody: Access = () => false

export const portalOwnerOnly: Access = ({ req }) => isPortalOwner(req.user)
export const portalOnly: Access = ({ req }) => isPortalUser(req.user)
export const portalOwnerOnlyField: FieldAccess = ({ req }) => isPortalOwner(req.user)
export const portalOnlyField: FieldAccess = ({ req }) => isPortalUser(req.user)

/** Old names, still used in a few places. */
export const superAdminOnly = portalOwnerOnly
export const superAdminOnlyField = portalOnlyField

/**
 * Create: portal users, or anyone who is Tenant Super Owner somewhere. Which tenant the new
 * document goes into is checked again in a beforeChange hook (assertCanManageTenant).
 */
export const portalOrAnyTenantOwner: Access = ({ req }) =>
  isPortalUser(req.user) || tenantIdsFor(req.user, ['owner']).length > 0

/** Delete tenant-owned documents: portal users anywhere, Tenant Super Owners in their tenants. */
export const deleteInOwnedTenants: Access = ({ req }) => {
  if (isPortalUser(req.user)) return true
  const owned = tenantIdsFor(req.user, ['owner'])
  return owned.length ? ({ tenant: { in: owned } } satisfies Where) : false
}
