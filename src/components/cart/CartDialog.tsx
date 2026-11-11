'use client'

import { Minus, Pill, Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button, Card, inputClass } from '@/components/ui'
import { formatINR } from '@/lib/format'

import { useCart, type CartItem } from './CartProvider'
import { SendOrderOnWhatsapp } from './Checkout'
// To bring back "Place your order": import { CheckoutForm, OrderPlaced, SendOrderOnWhatsapp } from './Checkout'
import Modal from './Modal'

function QuantityControl({ item }: { item: CartItem }) {
  const { setQuantity } = useCart()
  const [editing, setEditing] = useState<string | null>(null)
  const commit = () => {
    const n = parseInt(editing ?? '', 10)
    if (n > 0) setQuantity(item.id, n)
    setEditing(null)
  }
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        variant="outline"
        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
        aria-label={`Decrease ${item.name}`}
        onClick={() => setQuantity(item.id, item.quantity - 1)}
      >
        <Minus className="h-3 w-3" />
      </Button>
      {editing !== null ? (
        <input
          autoFocus
          type="number"
          min={1}
          inputMode="numeric"
          aria-label={`Quantity of ${item.name}`}
          value={editing}
          onChange={(e) => setEditing(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(null)
          }}
          className={`${inputClass} no-spinner h-7 w-14 px-1 text-center sm:h-8`}
        />
      ) : (
        <button
          type="button"
          title="Click to type a quantity"
          aria-label={`Quantity ${item.quantity}, click to edit`}
          onClick={() => setEditing(String(item.quantity))}
          className="flex h-7 w-10 items-center justify-center rounded border bg-gray-50 text-xs font-medium hover:bg-gray-100 sm:h-8 sm:w-12 sm:text-sm"
        >
          {item.quantity}
        </button>
      )}
      <Button
        variant="outline"
        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
        aria-label={`Increase ${item.name}`}
        onClick={() => setQuantity(item.id, item.quantity + 1)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}

export default function CartDialog({ whatsapp }: { whatsapp: string | null }) {
  const cart = useCart()
  const close = useCallback(() => cart.close(), [cart])
  const title = 'Shopping Cart'

  /*
   * ---- "Place your order" step (switched off) ----
   * The cart now sends the order straight to WhatsApp. To bring back the step that asks for the
   * customer's details and saves the order in the dashboard:
   *   1. Use this block instead of the three lines above.
   *   2. Uncomment the `step === 'checkout'` branch and the "Order placed" modal further down.
   *   3. Change the footer button back to "Proceed to order" (kept, commented, beside it).
   *
   * const [step, setStep] = useState<'cart' | 'checkout'>('cart')
   * const [placed, setPlaced] = useState<{ orderNumber: string; whatsappText: string } | null>(null)
   * const close = useCallback(() => {
   *   cart.close()
   *   setStep('cart')
   * }, [cart])
   * const onPlaced = useCallback((r: { orderNumber: string; whatsappText: string }) => {
   *   cart.close()
   *   setStep('cart')
   *   setPlaced(r)
   * }, [cart])
   * const title = step === 'checkout' ? 'Place your order' : 'Shopping Cart'
   */

  return (
    <>
      {cart.isOpen && (
        <Modal label={title} onClose={close} className="flex h-[95vh] w-full max-w-4xl sm:h-[90vh]">
          <Card className="flex w-full flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b px-3 py-3 sm:px-6 sm:py-4">
              <div>
                <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
                <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                  {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'} in cart
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={close} className="text-xl">
                ×
              </Button>
            </div>

            {cart.items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center text-gray-500">
                <div>
                  <div className="mb-4 text-4xl" aria-hidden>
                    🛒
                  </div>
                  <p className="text-lg">Your cart is empty</p>
                  <p className="mt-2 text-sm">Add some products to get started</p>
                </div>
              </div>
            ) : (
              /* "Place your order" step, switched off:
              step === 'checkout' ? (
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <CheckoutForm onPlaced={onPlaced} onBack={() => setStep('cart')} />
              </div>
            ) : */
              <>
                <ul className="flex-1 space-y-2 overflow-y-auto p-3 sm:space-y-3 sm:p-6">
                  {cart.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border bg-white p-2 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:p-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 p-1 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
                        {item.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbUrl} alt="" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Pill className="h-6 w-6 text-gray-300" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 truncate text-sm font-semibold leading-tight sm:text-base" title={item.name}>
                          {item.name}
                        </h3>
                        {item.company && <p className="mb-1 text-xs text-gray-600 sm:text-sm">{item.company}</p>}
                        {item.price !== null && (
                          <p className="text-sm font-bold text-primary sm:text-lg">{formatINR(item.price)}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-center gap-2">
                        <QuantityControl item={item} />
                        <Button
                          variant="destructive"
                          className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                          aria-label={`Remove ${item.name}`}
                          title="Remove item"
                          onClick={() => cart.remove(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="shrink-0 border-t bg-gray-50 p-3 sm:p-6">
                  <SendOrderOnWhatsapp whatsapp={whatsapp} />
                  {/* "Place your order" step, switched off:
                  <Button className="w-full" onClick={() => setStep('checkout')}>
                    Proceed to order
                  </Button> */}
                </div>
              </>
            )}
          </Card>
        </Modal>
      )}
      {/* "Order placed" confirmation, switched off with the "Place your order" step:
      {placed && (
        <Modal label="Order placed" onClose={() => setPlaced(null)} className="w-full max-w-md">
          <Card className="p-6">
            <OrderPlaced {...placed} whatsapp={whatsapp} onClose={() => setPlaced(null)} />
          </Card>
        </Modal>
      )} */}
    </>
  )
}
