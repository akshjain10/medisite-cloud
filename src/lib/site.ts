import type { CSSProperties } from 'react'

import type { Media, Tenant } from '@/payload-types'

import { safeColor } from './format'

/**
 * Everything the browser-side components need to know about a client site, with defaults
 * applied. Built on the server from the tenant document. Platform-only fields (plan, domain,
 * raw price mode) are deliberately not included.
 */
export type SiteConfig = {
  name: string
  slug: string
  logoUrl: string | null
  showName: boolean
  tagline: string | null
  footerDescription: string | null
  phone: string | null
  phoneNote: string | null
  email: string | null
  emailNote: string | null
  /** Digits only, e.g. 919876543210, or null if not set. */
  whatsapp: string | null
  address: string | null
  mapUrl: string | null
  businessHours: string | null
  drugLicenseNumber: string | null
  gstNumber: string | null
  showFab: boolean
  showEnquiry: boolean
  enquiryViaWhatsapp: boolean
  showPrivacy: boolean
  /** Cart and checkout, switched on per site in Site options. Orders are saved in the dashboard. */
  cartEnabled: boolean
  splash: boolean
  footerStyle: 'dark' | 'brand' | 'light'
  catalogue: {
    perPage: number
    showCompany: boolean
    showPacking: boolean
    showShare: boolean
    showSimilar: boolean
  }
}

const mediaUrl = (m: number | Media | null | undefined, size?: 'thumbnail' | 'card') =>
  m && typeof m === 'object' ? ((size && m.sizes?.[size]?.url) || m.url || null) : null

/** Only allow http(s) links, so a client cannot put javascript: URLs into the footer. */
const safeUrl = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : null)

export function siteConfig(tenant: Tenant): SiteConfig {
  const p = tenant.profile ?? {}
  const t = tenant.theme ?? {}
  const c = tenant.catalogue ?? {}
  const whatsapp = p.whatsapp ? p.whatsapp.replace(/\D/g, '') || null : null
  const perPage = Number(c.productsPerPage ?? 25)

  return {
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: mediaUrl(tenant.logo),
    showName: t.showNameInHeader !== false,
    tagline: p.tagline ?? null,
    footerDescription: p.footerDescription || p.tagline || null,
    phone: p.phone ?? null,
    phoneNote: p.phoneNote ?? null,
    email: p.email ?? null,
    emailNote: p.emailNote ?? null,
    whatsapp,
    address: p.address ?? null,
    mapUrl: safeUrl(p.mapUrl),
    businessHours: p.businessHours ?? null,
    drugLicenseNumber: p.drugLicenseNumber ?? null,
    gstNumber: p.gstNumber ?? null,
    showFab: p.showWhatsappButton !== false && Boolean(p.phone || whatsapp),
    showEnquiry: p.showEnquiryButton !== false,
    enquiryViaWhatsapp: Boolean(p.enquiryViaWhatsapp) && Boolean(whatsapp),
    showPrivacy: p.showPrivacyPolicy !== false,
    cartEnabled: tenant.enableCart !== false,
    splash: Boolean(t.splashScreen),
    footerStyle: t.footerStyle === 'brand' || t.footerStyle === 'light' ? t.footerStyle : 'dark',
    catalogue: {
      perPage: [25, 50, 100].includes(perPage) ? perPage : 25,
      showCompany: c.showCompany !== false,
      showPacking: c.showPacking !== false,
      showShare: c.showShare !== false,
      showSimilar: c.showSimilar !== false,
    },
  }
}

const FONTS: Record<string, string> = {
  sans: "'Inter Variable', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  roboto: "'Roboto Variable', system-ui, sans-serif",
  montserrat: "'Montserrat Variable', system-ui, sans-serif",
  'open-sans': "'Open Sans Variable', system-ui, sans-serif",
  nunito: "'Nunito Variable', system-ui, sans-serif",
  serif: "'Merriweather Variable', Georgia, serif",
}

const RADII: Record<string, [string, string, string, string]> = {
  //          sm         md          lg        xl
  rounded: ['0.25rem', '0.375rem', '0.5rem', '0.75rem'],
  soft: ['0.5rem', '0.75rem', '1rem', '1.5rem'],
  square: ['0px', '0px', '0px', '0px'],
}

/** CSS variables for <body>: brand colours feed the Tailwind tokens in globals.css. */
export function themeStyle(tenant: Tenant): CSSProperties {
  const t = tenant.theme ?? {}
  const [sm, md, lg, xl] = RADII[t.corners ?? 'rounded'] ?? RADII.rounded
  return {
    '--primary': safeColor(t.primaryColor),
    '--accent': safeColor(t.accentColor, '#c084fc'),
    '--radius-sm': sm,
    '--radius-md': md,
    '--radius-lg': lg,
    '--radius-xl': xl,
    fontFamily: FONTS[t.fontPreset ?? 'sans'] ?? FONTS.sans,
  } as CSSProperties
}

/** wa.me link with a message, or null if the site has no WhatsApp number. */
export const whatsappLink = (number: string | null, text?: string) =>
  number ? `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null
