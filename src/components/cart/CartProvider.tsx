'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { amountOf } from '@/lib/price'
import type { PublicProduct } from '@/lib/products'

export type CartItem = {
  id: number
  slug: string
  name: string
  company: string | null
  /** Price per unit (selling price, else MRP). Only present when this client shows prices. */
  price: number | null
  thumbUrl: string | null
  quantity: number
}

type CartContextValue = {
  enabled: boolean
  items: CartItem[]
  add: (product: PublicProduct, quantity?: number) => void
  setQuantity: (id: number, quantity: number) => void
  remove: (id: number) => void
  clear: () => void
  isOpen: boolean
  open: () => void
  close: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

/**
 * Cart kept in the visitor's own browser (localStorage), one cart per client site, like the
 * reference project. Nothing is sent anywhere until the visitor sends the order on WhatsApp.
 */
export function CartProvider({ siteSlug, enabled, children }: { siteSlug: string; enabled: boolean; children: ReactNode }) {
  const key = `cart:${siteSlug}`
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!enabled) return
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed))
          setItems(
            parsed
              .filter((i) => i && typeof i.id === 'number' && i.quantity > 0)
              .map((i) => ({ ...i, price: i.price ?? i.mrp ?? null })),
          )
      }
    } catch {
      // Storage blocked or corrupt: start with an empty cart.
    }
    setLoaded(true)
  }, [key, enabled])

  useEffect(() => {
    if (!enabled || !loaded) return
    try {
      if (items.length) localStorage.setItem(key, JSON.stringify(items))
      else localStorage.removeItem(key)
    } catch {
      // Ignore: the cart still works for this page view.
    }
  }, [items, key, enabled, loaded])

  const add = useCallback((product: PublicProduct, quantity = 1) => {
    const qty = Math.max(1, Math.floor(quantity))
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + qty } : i))
      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          company: product.company,
          price: amountOf(product.price),
          thumbUrl: product.thumbUrl,
          quantity: qty,
        },
      ]
    })
    toast.success('Added to cart', { description: `${product.name} (${qty} pc)`, duration: 1500 })
  }, [])

  const setQuantity = useCallback((id: number, quantity: number) => {
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, quantity: Math.floor(quantity) } : i)),
    )
  }, [])

  const remove = useCallback((id: number) => setItems((prev) => prev.filter((i) => i.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartContextValue>(
    () => ({
      enabled,
      items,
      add,
      setQuantity,
      remove,
      clear,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [enabled, items, add, setQuantity, remove, clear, isOpen],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
