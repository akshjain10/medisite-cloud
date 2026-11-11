'use server'

import { formatINR } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'
import { amountOf, resolvePrice } from '@/lib/products'
import { siteConfig } from '@/lib/site'
import { getCurrentTenant } from '@/lib/tenant'

export type CheckoutState =
  | { status: 'idle' }
  | { status: 'error'; message: string; values?: Record<string, string> }
  | { status: 'sent'; orderNumber: string; whatsappText: string }

const clean = (v: FormDataEntryValue | null, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const MAX_LINES = 300
const MAX_QTY = 100000

function orderNumber() {
  const d = new Date()
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 30)]).join('')
  return `${ymd}-${rand}`
}

/**
 * Saves the cart as an Order for the site being visited. Only product ids and quantities come
 * from the browser; names, codes and prices are read from the database, so nobody can change
 * them, and only published, visible products of this site are accepted.
 */
export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { status: 'error', message: 'This website could not be found.' }
  const site = siteConfig(tenant)
  if (!site.cartEnabled) return { status: 'error', message: 'Online ordering is switched off for this website.' }

  const values = {
    name: clean(formData.get('name'), 120),
    phone: clean(formData.get('phone'), 40),
    email: clean(formData.get('email'), 200),
    address: clean(formData.get('address'), 1000),
    note: clean(formData.get('note'), 1000),
  }
  // Honeypot: real visitors never fill this. Pretend it worked without saving.
  if (clean(formData.get('website'), 100)) return { status: 'sent', orderNumber: '—', whatsappText: '' }
  if (!values.name || values.phone.replace(/\D/g, '').length < 7)
    return { status: 'error', message: 'Please enter your name and a phone number.', values }

  let lines: { id: number; quantity: number }[]
  try {
    const raw = JSON.parse(clean(formData.get('items'), 50000) || '[]')
    lines = (Array.isArray(raw) ? raw : [])
      .map((l) => ({ id: Number(l?.id), quantity: Math.floor(Number(l?.quantity)) }))
      .filter((l) => Number.isInteger(l.id) && l.quantity >= 1)
      .map((l) => ({ ...l, quantity: Math.min(l.quantity, MAX_QTY) }))
      .slice(0, MAX_LINES)
  } catch {
    lines = []
  }
  if (!lines.length) return { status: 'error', message: 'Your cart is empty.', values }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'products',
    overrideAccess: true,
    depth: 0,
    pagination: false,
    where: {
      and: [
        { tenant: { equals: tenant.id } },
        { _status: { equals: 'published' } },
        { or: [{ visible: { equals: true } }, { visible: { exists: false } }] },
        { id: { in: lines.map((l) => l.id) } },
      ],
    },
    select: { name: true, code: true, company: true, packSize: true, mrp: true, price: true, priceOverride: true },
  })
  const byId = new Map(docs.map((d) => [d.id, d]))
  const items = lines
    .filter((l) => byId.has(l.id))
    .map((l) => {
      const d = byId.get(l.id)!
      const unit = d.price && d.price > 0 ? d.price : d.mrp && d.mrp > 0 ? d.mrp : null
      return { product: d.id, name: d.name, code: d.code ?? null, company: d.company ?? null, packing: d.packSize ?? null, quantity: l.quantity, unitPrice: unit, doc: d }
    })
  if (!items.length) return { status: 'error', message: 'The products in your cart are no longer available. Please add them again.', values }

  const number = orderNumber()
  const total = items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0)
  await payload.create({
    collection: 'orders',
    overrideAccess: true,
    data: {
      tenant: tenant.id,
      orderNumber: number,
      status: 'new',
      customerName: values.name,
      phone: values.phone,
      email: values.email || undefined,
      address: values.address || undefined,
      note: values.note || undefined,
      items: items.map(({ doc: _doc, ...i }) => i),
      itemCount: items.length,
      total: total > 0 ? Math.round(total * 100) / 100 : undefined,
    } as never,
  })

  // WhatsApp message in the reference format; prices only if this site shows them.
  let text = `🛒 New Order Request\n🧾 Order no: ${number}\n\n📋 Order Details:\n`
  items.forEach((i, n) => {
    const shown = amountOf(resolvePrice(i.doc, tenant))
    text += `${n + 1}. ${i.name}${i.company ? ` (${i.company})` : ''} - ${i.quantity} pc${shown !== null ? ` @ ${formatINR(shown)}` : ''}\n`
  })
  text += `\n💰 Total Items: ${items.length}\n👤 ${values.name}, 📞 ${values.phone}`
  if (values.address) text += `\n📍 ${values.address}`
  if (values.note) text += `\n📝 ${values.note}`

  return { status: 'sent', orderNumber: number, whatsappText: text }
}
