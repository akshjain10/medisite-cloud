'use client'

import { useAuth, useConfig } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'

const FLAG = 'pharma:fromLogin'

const store = {
  set: () => {
    try {
      sessionStorage.setItem(FLAG, '1')
    } catch {}
  },
  take: () => {
    try {
      const had = sessionStorage.getItem(FLAG) === '1'
      sessionStorage.removeItem(FLAG)
      return had
    } catch {
      return false
    }
  },
}

/**
 * Always open the Dashboard right after logging in.
 * Payload normally returns you to the page you were on when you were logged out (for example
 * Import products after a session timed out). This provider notices that the login page was
 * shown and, once the login succeeds, moves you to the Dashboard instead.
 * Registered in payload.config.ts under admin.components.providers.
 */
export default function DashboardAfterLogin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { config } = useConfig()
  const pathname = usePathname()
  const router = useRouter()
  const adminRoute = config.routes.admin
  const loginRoute = `${adminRoute}${config.admin.routes.login ?? '/login'}`
  const createFirstUserRoute = `${adminRoute}${config.admin.routes.createFirstUser ?? '/create-first-user'}`

  useEffect(() => {
    if (pathname === loginRoute || pathname === createFirstUserRoute) {
      store.set()
      return
    }
    if (user && store.take() && pathname !== adminRoute) router.replace(adminRoute)
  }, [user, pathname, loginRoute, createFirstUserRoute, adminRoute, router])

  return <>{children}</>
}
