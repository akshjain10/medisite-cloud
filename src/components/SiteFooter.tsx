import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Link from 'next/link'

import type { SiteConfig } from '@/lib/site'
import { whatsappLink } from '@/lib/site'

import { cx } from './ui'

const STYLES = {
  dark: { wrap: 'bg-gray-900 text-white', muted: 'text-gray-300', faint: 'text-gray-400', rule: 'bg-gray-700', hover: 'hover:text-primary-light' },
  brand: { wrap: 'bg-primary-darker text-white', muted: 'text-white/80', faint: 'text-white/60', rule: 'bg-white/20', hover: 'hover:text-white hover:underline' },
  light: { wrap: 'bg-gray-100 text-gray-900', muted: 'text-gray-600', faint: 'text-gray-500', rule: 'bg-gray-300', hover: 'hover:text-primary' },
}

export default function SiteFooter({ site }: { site: SiteConfig }) {
  const s = STYLES[site.footerStyle]
  const wa = whatsappLink(site.whatsapp, 'Hello, I would like to enquire about your products.')
  const mapHref =
    site.mapUrl ?? (site.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name}, ${site.address}`)}` : null)
  const row = cx('flex items-center space-x-3 transition-colors', s.hover)

  return (
    <footer className={cx('py-12', s.wrap)}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[2fr_auto_2fr]">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {site.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.logoUrl} alt="" className="h-8 w-auto" />
              )}
              <p className="text-xl font-bold">{site.name}</p>
            </div>
            {site.footerDescription && <p className={s.muted}>{site.footerDescription}</p>}
          </div>

          {(site.phone || wa || site.email) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Contact Us</h2>
              <div className="space-y-3">
                {site.phone && (
                  <a href={`tel:${site.phone.replace(/[^\d+]/g, '')}`} className={row}>
                    <Phone className="h-5 w-5 shrink-0" aria-hidden />
                    <span>{site.phone}</span>
                  </a>
                )}
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className={row}>
                    <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                    <span>WhatsApp</span>
                  </a>
                )}
                {site.email && (
                  <a href={`mailto:${site.email}`} className={row}>
                    <Mail className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="break-all">{site.email}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {(site.address || site.drugLicenseNumber || site.gstNumber) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Address</h2>
              {site.address &&
                (mapHref ? (
                  <a href={mapHref} target="_blank" rel="noopener noreferrer" className={cx('flex items-start space-x-3 transition-colors', s.hover)}>
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <div>
                      <p>{site.name}</p>
                      <p className="whitespace-pre-line">{site.address}</p>
                    </div>
                  </a>
                ) : null)}
              {(site.drugLicenseNumber || site.gstNumber) && (
                <div className={cx('space-y-1 text-sm', s.faint)}>
                  {site.drugLicenseNumber && <p>Drug licence no. {site.drugLicenseNumber}</p>}
                  {site.gstNumber && <p>GSTIN {site.gstNumber}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={cx('my-8 h-px', s.rule)} />

        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <p className={cx('text-sm', s.faint)}>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          {site.showPrivacy && (
            <div className="flex space-x-6 text-sm">
              <Link href="/privacy" className={cx('transition-colors', s.faint, s.hover)}>
                Privacy Policy
              </Link>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
