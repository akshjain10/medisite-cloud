'use client'

import { CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'

import { placeOrder, type CheckoutState } from '@/app/(site)/order/actions'
import BrandIcon from '@/components/BrandIcon'
import { buttonClass, inputClass } from '@/components/ui'
import { formatINR } from '@/lib/format'
import { whatsappLink } from '@/lib/site'

import { useCart } from './CartProvider'

const label = 'mb-1 block text-sm font-medium'

/** The cart as a WhatsApp message, in the reference format. Prices only appear when the site shows them. */
export function cartWhatsappText(items: { name: string; company: string | null; quantity: number; price: number | null }[]) {
  let text = '🛒 New Order Request\n\n📋 Order Details:\n'
  items.forEach((i, n) => {
    text += `${n + 1}. ${i.name}${i.company ? ` (${i.company})` : ''} - ${i.quantity} pc${i.price !== null ? ` @ ${formatINR(i.price)}` : ''}\n`
  })
  text += `\n💰 Total Items: ${items.length}`
  return text
}

/**
 * "Send order on WhatsApp": opens WhatsApp with the cart as a message. This is the active way to
 * order. Nothing is saved in the dashboard's Orders list (that needs CheckoutForm below).
 */
export function SendOrderOnWhatsapp({ whatsapp, onSent, className = 'w-full' }: { whatsapp: string | null; onSent?: () => void; className?: string }) {
  const cart = useCart()
  const wa = whatsappLink(whatsapp, cartWhatsappText(cart.items))
  if (!wa)
    return (
      <Link href="/contact" className={buttonClass('default', 'default', className)}>
        Contact us to order
      </Link>
    )
  return (
    <a
      href={wa}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!cart.items.length}
      onClick={(e) => {
        if (!cart.items.length) return e.preventDefault()
        onSent?.()
      }}
      className={buttonClass('whatsapp', 'default', className)}
    >
      <BrandIcon name="whatsapp" className="h-5 w-5" />
      Send order on WhatsApp
    </a>
  )
}

/*
 * ---- Saved orders (switched off) ----
 * CheckoutForm and OrderPlaced below are the "Place your order" step: they ask for the customer's
 * details, save an Order in the dashboard, and then offer WhatsApp. They are not used right now.
 * To bring them back, follow the "To bring back" notes in CartDialog.tsx and OrderClient.tsx.
 */

/** Customer details and "Place Order". Saves the order, then empties the cart. */
export function CheckoutForm({ onPlaced, onBack }: { onPlaced: (r: { orderNumber: string; whatsappText: string }) => void; onBack?: () => void }) {
  const cart = useCart()
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, { status: 'idle' })
  const handled = useRef(false)

  useEffect(() => {
    if (state.status === 'sent' && !handled.current) {
      handled.current = true
      cart.clear()
      onPlaced({ orderNumber: state.orderNumber, whatsappText: state.whatsappText })
    }
  }, [state, cart, onPlaced])

  const v = state.status === 'error' ? state.values : undefined

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(cart.items.map((i) => ({ id: i.id, quantity: i.quantity })))} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px]" />
      <p className="text-sm text-gray-600">
        {cart.items.length} {cart.items.length === 1 ? 'product' : 'products'} in your order. We will contact you to confirm availability and delivery.
      </p>
      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="co-name" className={label}>
            Name *
          </label>
          <input id="co-name" name="name" required maxLength={120} autoComplete="name" defaultValue={v?.name} className={inputClass} />
        </div>
        <div>
          <label htmlFor="co-phone" className={label}>
            Phone *
          </label>
          <input id="co-phone" name="phone" type="tel" required maxLength={40} autoComplete="tel" defaultValue={v?.phone} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="co-email" className={label}>
          Email
        </label>
        <input id="co-email" name="email" type="email" maxLength={200} autoComplete="email" defaultValue={v?.email} className={inputClass} />
      </div>
      <div>
        <label htmlFor="co-address" className={label}>
          Delivery address
        </label>
        <textarea id="co-address" name="address" rows={2} maxLength={1000} autoComplete="street-address" defaultValue={v?.address} className={`${inputClass} h-auto`} />
      </div>
      <div>
        <label htmlFor="co-note" className={label}>
          Note
        </label>
        <textarea id="co-note" name="note" rows={2} maxLength={1000} placeholder="Anything we should know?" defaultValue={v?.note} className={`${inputClass} h-auto`} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {onBack ? (
          <button type="button" className={buttonClass('outline')} onClick={onBack} disabled={pending}>
            Back to cart
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className={buttonClass('default', 'default', 'sm:w-56')} disabled={pending || !cart.items.length}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Placing order...
            </>
          ) : (
            'Place Order'
          )}
        </button>
      </div>
    </form>
  )
}

/** Confirmation with the order number, and a WhatsApp button when the site has a number. */
export function OrderPlaced({ orderNumber, whatsappText, whatsapp, onClose }: { orderNumber: string; whatsappText: string; whatsapp: string | null; onClose: () => void }) {
  const wa = whatsappText ? whatsappLink(whatsapp, whatsappText) : null
  return (
    <div className="space-y-4 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500" aria-hidden />
      <h2 className="text-2xl font-semibold text-green-600">Order placed</h2>
      <p className="text-gray-600">
        Your order number is <span className="font-semibold text-gray-900">{orderNumber}</span>. We will contact you soon to confirm it.
      </p>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass('whatsapp', 'default', 'w-full')}>
          <BrandIcon name="whatsapp" className="h-5 w-5" />
          Also send it on WhatsApp
        </a>
      )}
      <button type="button" data-autofocus className={buttonClass('outline', 'default', 'w-full')} onClick={onClose}>
        Continue shopping
      </button>
    </div>
  )
}
