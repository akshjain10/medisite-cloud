'use client'

import { MessageCircle, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import BrandIcon from '@/components/BrandIcon'
import { useCart } from '@/components/cart/CartProvider'
import { UnlockButton } from '@/components/PriceLock'
import { PriceTag } from '@/components/PriceTag'
import { Button, buttonClass, inputClass } from '@/components/ui'
import { formatINR } from '@/lib/format'
import type { PublicProduct } from '@/lib/products'
import { whatsappLink } from '@/lib/site'

/**
 * Product page price box: the selling price (₹0.00 when none is set) and, when there is one,
 * the MRP. A lower selling price crosses out the MRP and shows the % off.
 */
function PriceAndMrp({ mrp, price, locked }: { mrp: number | null; price: number | null; locked: boolean }) {
  const sell = price ?? 0
  const off = mrp !== null && price !== null && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0
  return (
    <div className="mb-2 space-y-1">
      <h3 className="font-semibold text-gray-700">Price</h3>
      {locked ? <UnlockButton className="text-base" /> : <p className="text-3xl font-bold text-primary">{formatINR(sell)}</p>}
      {mrp !== null && (
        <p className="text-sm text-gray-600">
          MRP: <span className={off > 0 ? 'line-through' : 'font-medium text-gray-900'}>{formatINR(mrp)}</span>
          {off > 0 && <span className="ml-2 font-semibold text-green-600">{off}% off</span>}
        </p>
      )}
    </div>
  )
}

/** Price, quantity, Add to Cart and Enquire via WhatsApp, as in the reference's ProductInfo card. */
export default function ProductActions({
  product,
  whatsapp,
  showEnquiry,
  enquiryText,
}: {
  product: PublicProduct
  whatsapp: string | null
  showEnquiry: boolean
  enquiryText: string
}) {
  const cart = useCart()
  const [qty, setQty] = useState<string>('1')
  const n = parseInt(qty, 10)
  const add = () => cart.add(product, n > 0 ? n : 1)
  const qtyLine = cart.enabled && n > 0 ? `\n📦 Requested quantity: ${n} pcs` : ''
  const wa = whatsappLink(whatsapp, `${enquiryText}${qtyLine}\n\n📱 Please share availability and details for this product.`)

  return (
    <>
      <div className="flex flex-col space-y-2">
        {product.price.kind === 'amount' && <PriceAndMrp mrp={product.price.mrp} price={product.price.price} locked={Boolean(product.price.locked)} />}
        {product.price.kind === 'quote' && <PriceTag price={product.price} productSlug={product.slug} size="detail" />}
        {cart.enabled && (
          <label className="flex flex-col space-y-2">
            <span className="text-sm font-medium">Quantity</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Qty"
              value={qty}
              onChange={(e) => /^\d*$/.test(e.target.value) && setQty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              className={`${inputClass} no-spinner h-8 w-20`}
            />
          </label>
        )}
      </div>

      <div className="col-span-full space-y-4">
        {cart.enabled && (
          <div className="pt-2">
            <Button className="w-full" onClick={add}>
              <ShoppingCart className="h-4 w-4" aria-hidden />
              Add to Cart
            </Button>
          </div>
        )}
        {showEnquiry && (
          <div className="pt-2">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass('whatsappOutline', 'default', 'w-full')}>
                <BrandIcon name="whatsapp" className="h-4 w-4" />
                Enquire via WhatsApp
              </a>
            ) : (
              <Link href={`/contact?product=${encodeURIComponent(product.slug)}`} className={buttonClass('outline', 'default', 'w-full')}>
                <MessageCircle className="h-4 w-4" aria-hidden />
                Send an enquiry
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
