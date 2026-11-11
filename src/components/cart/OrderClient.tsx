'use client'

import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button, Card, CardContent, CardHeader, CardTitle, inputClass } from '@/components/ui'
import { formatINR } from '@/lib/format'
import { amountOf } from '@/lib/price'
import type { PublicProduct } from '@/lib/products'

import { useCart } from './CartProvider'
import { SendOrderOnWhatsapp } from './Checkout'
// To bring back "Your details": import { CheckoutForm, OrderPlaced, SendOrderOnWhatsapp } from './Checkout'
// and import Modal from './Modal'

const matches = (p: PublicProduct, words: string[]) =>
  words.every((w) =>
    [p.name, p.company, p.composition].some((field) => field?.toLowerCase().includes(w)),
  )

/** Quick-order page from the reference: type a product, enter a quantity, send the list on WhatsApp. */
export default function OrderClient({ products, whatsapp }: { products: PublicProduct[]; whatsapp: string | null }) {
  const cart = useCart()
  // "Your details" form (switched off): const [placed, setPlaced] = useState<{ orderNumber: string; whatsappText: string } | null>(null)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<PublicProduct | null>(null)
  const [qty, setQty] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const qtyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const results = useMemo(() => {
    const words = debounced.toLowerCase().split(/\s+/).filter(Boolean)
    return words.length ? products.filter((p) => matches(p, words)).slice(0, 50) : []
  }, [products, debounced])

  const choose = (p: PublicProduct) => {
    setSelected(p)
    setQty('')
    setQuery('')
    setDebounced('')
    setTimeout(() => qtyRef.current?.focus(), 0)
  }

  const addSelected = () => {
    if (!selected) return
    const n = parseInt(qty, 10)
    if (!n || n <= 0) {
      toast.error('Enter a quantity', { description: 'Type how many you need, then press Add to Cart.' })
      return
    }
    cart.add(selected, n)
    setSelected(null)
    setQty('')
  }

  return (
    <div className="space-y-6">
      {cart.items.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl">Cart Summary</CardTitle>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Remove all items?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      cart.clear()
                      setConfirmClear(false)
                      toast('Cart cleared')
                    }}
                  >
                    Yes, clear
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="destructive" onClick={() => setConfirmClear(true)}>
                  Clear Cart
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="h-12 px-4 font-medium">Product Name</th>
                    <th className="h-12 w-24 px-4 font-medium">Quantity</th>
                    <th className="h-12 w-28 px-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.id} className="border-b transition-colors hover:bg-gray-50">
                      <td className="p-4">
                        {item.name}
                        {item.company && <span className="block text-xs text-gray-500">{item.company}</span>}
                      </td>
                      <td className="p-4">{item.quantity}</td>
                      <td className="p-4">
                        <Button variant="destructive" size="sm" onClick={() => cart.remove(item.id)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t p-3 sm:p-6">
              <SendOrderOnWhatsapp whatsapp={whatsapp} className="w-full sm:w-auto" />
            </div>
            {/*
              ---- "Your details" form (switched off) ----
              Asks for name, phone and address and saves the order in the dashboard's Orders list.
              To bring it back, uncomment this block, the `placed` state and the "Order placed"
              modal at the bottom, restore the imports at the top, and remove the WhatsApp
              button above if you only want one way to order.
            <div className="border-t p-3 sm:p-6">
              <h3 className="mb-4 text-lg font-semibold">Your details</h3>
              <CheckoutForm onPlaced={setPlaced} />
            </div>
            */}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Order Products</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              aria-label="Search products to order"
              placeholder="Search products to order..."
              className={`${inputClass} pl-10`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelected(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setDebounced(query)
                if (e.key === 'Enter' && results.length === 1) choose(results[0])
              }}
            />
            {debounced.trim() && (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg">
                {results.length === 0 ? (
                  <li className="px-4 py-2 text-sm text-gray-500">No products found</li>
                ) : (
                  results.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => choose(p)} className="w-full px-4 py-2 text-left hover:bg-gray-100">
                        <span className="block font-medium">{p.name}</span>
                        <span className="block text-sm text-gray-500">
                          {[p.company, amountOf(p.price) !== null ? formatINR(amountOf(p.price) as number) : null].filter(Boolean).join(' – ')}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {selected && (
            <div className="mt-4 w-full py-4">
              <label htmlFor="order-qty" className="mb-2 block text-sm font-medium text-gray-700">
                Quantity for <span className="font-semibold">{selected.name}</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="order-qty"
                  ref={qtyRef}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Enter quantity"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSelected()}
                  className={`${inputClass} no-spinner w-full sm:w-32`}
                />
                <Button onClick={addSelected}>Add to Cart</Button>
              </div>
            </div>
          )}

          {products.length === 0 && <p className="mt-4 text-gray-500">No products have been published yet.</p>}
        </CardContent>
      </Card>

      {/* "Order placed" confirmation, switched off with the "Your details" form:
      {placed && (
        <Modal label="Order placed" onClose={() => setPlaced(null)} className="w-full max-w-md">
          <Card className="p-6">
            <OrderPlaced {...placed} whatsapp={whatsapp} onClose={() => setPlaced(null)} />
          </Card>
        </Modal>
      )} */}
    </div>
  )
}
