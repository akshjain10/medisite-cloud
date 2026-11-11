import '@fontsource-variable/inter'
import '@fontsource-variable/merriweather'
import '@fontsource-variable/montserrat'
import '@fontsource-variable/nunito'
import '@fontsource-variable/open-sans'
import '@fontsource-variable/roboto'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

import CartDialog from '@/components/cart/CartDialog'
import { CartProvider } from '@/components/cart/CartProvider'
import ContactButton from '@/components/ContactButton'
import { PriceLockProvider } from '@/components/PriceLock'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'
import SplashScreen, { splashScript } from '@/components/SplashScreen'
import { hasCatalogues } from '@/lib/catalogues'
import { siteConfig, themeStyle } from '@/lib/site'
import { getCurrentTenant } from '@/lib/tenant'

import './globals.css'

// The font files above only declare @font-face rules: a browser downloads just the one font
// the client picked (see themeStyle), so offering several fonts costs nothing per page.

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant()
  return {
    title: tenant ? { default: tenant.name, template: `%s | ${tenant.name}` } : 'Pharma Sites',
    description: tenant?.profile?.tagline ?? undefined,
  }
}

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
          <main className="container mx-auto px-4 py-20">
            <h1 className="mb-4 text-3xl font-bold">No website at this address</h1>
            <p className="max-w-xl text-gray-600">
              Create a tenant in the{' '}
              <a href="/admin" className="text-blue-600 underline">
                admin panel
              </a>
              , then open it at &lt;slug&gt;.{process.env.PLATFORM_DOMAIN ?? 'localhost'} or its custom domain.
            </p>
          </main>
        </body>
      </html>
    )
  }

  const site = siteConfig(tenant)

  return (
    // The splash script may add data-splash-seen to <html> before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>{site.splash && <script dangerouslySetInnerHTML={{ __html: splashScript }} />}</head>
      <body style={themeStyle(tenant)} className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <PriceLockProvider enabled={tenant.priceMode === 'locked'} unlocked={Boolean(tenant.priceUnlocked)} canRelock={tenant.priceUnlockedBy === 'password'}>
        <CartProvider siteSlug={site.slug} enabled={site.cartEnabled}>
          {site.splash && <SplashScreen name={site.name} logoUrl={site.logoUrl} />}
          <SiteHeader name={site.name} logoUrl={site.logoUrl} showName={site.showName} cartEnabled={site.cartEnabled} showCatalogues={await hasCatalogues(tenant)} />

          {/* Pages control their own width: full-bleed sections or <PageShell>, as in the reference. */}
          <main>{children}</main>

          <SiteFooter site={site} />
          {site.showFab && <ContactButton phone={site.phone} whatsapp={site.whatsapp} />}
          {site.cartEnabled && <CartDialog whatsapp={site.whatsapp} />}
          <Toaster position="top-center" richColors closeButton />
        </CartProvider>
        </PriceLockProvider>
      </body>
    </html>
  )
}
