'use client'

/**
 * Brand glyphs (WhatsApp, Telegram, ...) from Font Awesome, the same icon set the reference
 * project uses. Styles are imported here once and auto-injection is turned off, which is the
 * recommended setup for Next.js (avoids a flash of huge icons).
 */
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import {
  faFacebook,
  faPinterest,
  faTelegram,
  faWhatsapp,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

config.autoAddCss = false

const ICONS = {
  whatsapp: faWhatsapp,
  telegram: faTelegram,
  facebook: faFacebook,
  x: faXTwitter,
  pinterest: faPinterest,
}

export type BrandName = keyof typeof ICONS

export default function BrandIcon({ name, className }: { name: BrandName; className?: string }) {
  return <FontAwesomeIcon icon={ICONS[name]} className={className} aria-hidden />
}
