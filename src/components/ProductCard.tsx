import { Pill } from 'lucide-react'
import Link from 'next/link'

import type { PublicProduct } from '@/lib/products'

import { PriceTag } from './PriceTag'
import { Card } from './ui'

export type CardOptions = { showCompany: boolean; showPacking: boolean }

/** Product card in the reference layout: contained image on grey, name, salt, company, packing, MRP. */
export function ProductCard({ product, options = { showCompany: true, showPacking: true } }: { product: PublicProduct; options?: CardOptions }) {
  const href = `/products/${product.slug}`
  return (
    <Card className="flex h-full flex-col transition-shadow duration-300 hover:shadow-lg">
      {/* The image link repeats the title link, so keep it out of the tab order. */}
      <Link href={href} tabIndex={-1} aria-hidden className="block">
        <div className="flex h-48 items-center justify-center overflow-hidden rounded-t-lg bg-gray-50">
          {product.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.thumbUrl}
              alt=""
              loading="lazy"
              className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <Pill className="h-12 w-12 text-gray-300" />
          )}
        </div>
      </Link>
      <div className="flex-1 p-4">
        <h3 className="mb-2 text-lg font-semibold" title={product.name}>
          <Link href={href} className="transition-colors hover:text-primary">
            {product.name}
          </Link>
        </h3>
        {product.composition && (
          <p className="mb-1 line-clamp-2 text-sm text-gray-600" title={product.composition}>
            {product.composition}
          </p>
        )}
        {options.showCompany && product.company && <p className="mb-1 text-sm text-gray-600">Company: {product.company}</p>}
        {options.showPacking && product.packSize && <p className="mb-1 text-sm text-gray-600">Packing: {product.packSize}</p>}
        {product.form && <p className="mb-2 text-sm text-gray-600">Form: {product.form}</p>}
        <PriceTag price={product.price} productSlug={product.slug} />
      </div>
    </Card>
  )
}
