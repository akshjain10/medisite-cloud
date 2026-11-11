'use client'

import { Phone, X } from 'lucide-react'
import { useState } from 'react'

import { whatsappLink } from '@/lib/site'

import BrandIcon from './BrandIcon'

/** Floating round button that opens Call and WhatsApp shortcuts, as in the reference. */
export default function ContactButton({ phone, whatsapp }: { phone: string | null; whatsapp: string | null }) {
  const [open, setOpen] = useState(false)
  const wa = whatsappLink(whatsapp, 'Hello, I would like to enquire about your products.')
  const round = 'flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-colors'

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end space-y-3">
        {open && (
          <>
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${phone}`} className={`${round} animate-rise-in bg-primary hover:bg-primary-dark`}>
                <Phone className="h-5 w-5" aria-hidden />
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className={`${round} animate-rise-in bg-green-600 hover:bg-green-700`}>
                <BrandIcon name="whatsapp" className="h-5 w-5" />
              </a>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close contact options' : 'Contact us'}
          className={`${round} bg-accent hover:bg-accent-dark`}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Phone className="h-6 w-6" aria-hidden />}
        </button>
      </div>
    </div>
  )
}
