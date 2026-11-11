'use client'

import { FileText, Home, Menu, Package, Phone, ShoppingBag, ShoppingCart, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useCart } from './cart/CartProvider'
import { PriceLockToggle } from './PriceLock'
import { Button, cx } from './ui'

type Props = {
  name: string
  logoUrl: string | null
  showName: boolean
  cartEnabled: boolean
  /** Company-wise PDF catalogues are switched on and at least one is uploaded. */
  showCatalogues: boolean
}

export default function SiteHeader({ name, logoUrl, showName, cartEnabled, showCatalogues }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const cart = useCart()

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname])

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Products', icon: Package },
    ...(showCatalogues ? [{ href: '/catalogues', label: 'Catalogues', icon: FileText }] : []),
    ...(cartEnabled ? [{ href: '/order', label: 'Order', icon: ShoppingBag }] : []),
    { href: '/contact', label: 'Contact', icon: Phone },
  ]
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center space-x-6">
            <Link href="/" className="flex min-w-0 items-center space-x-2">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={showName ? '' : name} className="h-12 w-auto shrink-0" />
              )}
              {(showName || !logoUrl) && (
                <span className="truncate text-[19px] font-bold text-primary sm:text-2xl">{name}</span>
              )}
            </Link>

            <nav className="hidden items-center space-x-6 lg:flex" aria-label="Main">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={cx(
                    'flex items-center space-x-1 transition-colors hover:text-primary',
                    isActive(href) ? 'text-primary' : 'text-gray-600',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center space-x-2">
            <PriceLockToggle />
            {cartEnabled && (
              <Button variant="outline" onClick={cart.open} className="relative" aria-label={`Cart, ${cart.items.length} items`}>
                <ShoppingCart className="h-5 w-5" aria-hidden />
                <span className="hidden sm:inline">Cart</span>
                {cart.items.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {cart.items.length}
                  </span>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              className="lg:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" className="mt-4 border-t pb-4 lg:hidden" aria-label="Mobile">
            <div className="flex flex-col space-y-2 pt-4">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={cx(
                    'flex items-center space-x-2 rounded p-2 transition-colors hover:bg-primary-soft hover:text-primary',
                    isActive(href) ? 'bg-primary-soft text-primary' : 'text-gray-600',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
