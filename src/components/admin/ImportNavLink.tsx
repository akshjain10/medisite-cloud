'use client'

import { useConfig } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** "Import products" entry in the admin side menu. */
export default function ImportNavLink() {
  const { config } = useConfig()
  const pathname = usePathname()
  const href = `${config.routes.admin}/import-products`
  const active = pathname === href
  return (
    <Link href={href} className="nav__link" id="nav-import-products" style={{ fontWeight: active ? 600 : undefined }}>
      {active && <div className="nav__link-indicator" />}
      <span className="nav__link-label">Import products</span>
    </Link>
  )
}
