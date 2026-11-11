'use client'

import { Copy, Mail, Share2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import BrandIcon, { type BrandName } from '@/components/BrandIcon'
import { Button } from '@/components/ui'

type Option = { id: string; label: string; brand?: BrandName; color?: string }

const OPTIONS: Option[] = [
  { id: 'whatsapp', label: 'WhatsApp', brand: 'whatsapp', color: 'text-green-600' },
  { id: 'telegram', label: 'Telegram', brand: 'telegram', color: 'text-sky-500' },
  { id: 'email', label: 'Email' },
  { id: 'facebook', label: 'Facebook', brand: 'facebook', color: 'text-blue-600' },
  { id: 'x', label: 'X (Twitter)', brand: 'x', color: 'text-gray-900' },
  { id: 'pinterest', label: 'Pinterest', brand: 'pinterest', color: 'text-red-600' },
  { id: 'copy', label: 'Copy link' },
]

/**
 * Share popover from the reference. `details` is the product summary text; it only contains
 * the MRP when the client shows prices (built on the server from PublicProduct).
 */
export default function ShareMenu({ title, details }: { title: string; details: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const share = async (id: string) => {
    const url = window.location.href.split('#')[0]
    const text = `${details}\n\n📱 View details: ${url}`
    const e = encodeURIComponent
    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${e(text)}`,
      telegram: `https://t.me/share/url?url=${e(url)}&text=${e(details)}`,
      email: `mailto:?subject=${e(`Check out this product: ${title}`)}&body=${e(`I thought you might be interested in this product:\n\n${text}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
      x: `https://twitter.com/intent/tweet?text=${e(details)}&url=${e(url)}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${e(url)}&description=${e(details)}`,
    }
    setOpen(false)
    if (id === 'copy') {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Copied to clipboard', { description: 'Product details and link copied.' })
      } catch {
        toast.error('Could not copy', { description: url })
      }
      return
    }
    if (id === 'email') window.location.href = links.email
    else window.open(links[id], '_blank', 'noopener,noreferrer')
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Share2 className="h-4 w-4" aria-hidden />
        <span>Share</span>
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 grid w-56 gap-1 rounded-lg bg-white p-2 shadow-lg ring-1 ring-black/5">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              onClick={() => share(o.id)}
              className="flex h-10 items-center rounded-md px-3 text-left text-sm hover:bg-gray-100"
            >
              {o.brand ? (
                <BrandIcon name={o.brand} className={`mr-3 h-5 w-5 ${o.color}`} />
              ) : o.id === 'email' ? (
                <Mail className="mr-3 h-5 w-5" aria-hidden />
              ) : (
                <Copy className="mr-3 h-5 w-5" aria-hidden />
              )}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
