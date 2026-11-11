import Link from 'next/link'

import { formatINR } from '@/lib/format'
import type { PublicPrice } from '@/lib/products'

import { UnlockButton } from './PriceLock'

/**
 * Price display:
 *  - selling price lower than MRP: "₹28.00  MRP ₹32.00 (crossed out)  13% off"
 *  - only one of them: "MRP ₹32.00" or "₹28.00"
 *  - "Request a quote" link, or nothing when prices are hidden.
 *  - locked: the MRP (unless that is locked too) and an "Unlock price" button.
 */
export function PriceTag({ price, productSlug, size = 'card' }: { price: PublicPrice; productSlug: string; size?: 'card' | 'detail' }) {
  if (price.kind === 'quote')
    return (
      <Link className="font-medium text-primary underline-offset-2 hover:underline" href={`/contact?product=${encodeURIComponent(productSlug)}`}>
        Request a quote
      </Link>
    )
  if (price.kind !== 'amount') return null

  const big = size === 'detail' ? 'text-3xl' : 'text-xl'
  const { mrp, price: sell } = price
  if (price.locked)
    return (
      <div className="space-y-1">
        {mrp !== null && <p className="text-sm text-gray-600">MRP {formatINR(mrp)}</p>}
        <UnlockButton />
      </div>
    )
  const discounted = sell !== null && mrp !== null && sell < mrp

  if (discounted) {
    const off = Math.round(((mrp - sell) / mrp) * 100)
    return (
      <div className={size === 'detail' ? 'mb-2' : ''}>
        <p className={`${big} font-bold text-primary`}>{formatINR(sell)}</p>
        <p className="text-sm text-gray-500">
          MRP <span className="line-through">{formatINR(mrp)}</span>
          {off > 0 && <span className="ml-2 font-semibold text-green-600">{off}% off</span>}
        </p>
      </div>
    )
  }
  const amount = sell ?? mrp
  if (amount === null) return null
  return (
    <p className={`${big} font-bold text-primary ${size === 'detail' ? 'mb-2' : ''}`}>
      {sell === null ? 'MRP ' : ''}
      {formatINR(amount)}
    </p>
  )
}
