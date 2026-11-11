'use client'

import { useAuth, useConfig } from '@payloadcms/ui'
import { LogOut } from 'lucide-react'

import { roleLabel } from '@/access'

/** Shown at the top right of every admin page: who you are, your role, and Log out. */
export default function UserMenu() {
  const { user } = useAuth()
  const { config } = useConfig()
  if (!user) return null
  const logoutHref = `${config.routes.admin}${config.admin.routes.logout ?? '/logout'}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
      <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{(user as { email?: string }).email}</div>
        <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)' }}>{roleLabel(user as never)}</div>
      </div>
      <a
        href={logoutHref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 4,
          border: '1px solid var(--theme-elevation-150)',
          background: 'var(--theme-elevation-0)',
          color: 'var(--theme-text)',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <LogOut size={15} aria-hidden />
        Log out
      </a>
    </div>
  )
}
