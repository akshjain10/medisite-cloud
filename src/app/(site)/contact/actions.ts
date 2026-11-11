'use server'

import { getPayloadClient } from '@/lib/payload'
import { getPublicProduct } from '@/lib/products'
import { getCurrentTenant } from '@/lib/tenant'

export type EnquiryState = {
  status: 'idle' | 'sent' | 'error'
  /** Echoed back so the visitor does not retype on error, and to prefill the optional WhatsApp hand-off. */
  values?: { name: string; phone: string; email: string; message: string }
  /** Product name, when the enquiry was about one. */
  productName?: string
}

const clean = (v: FormDataEntryValue | null, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

/**
 * Returns a result instead of redirecting. A redirect makes Next render the target page in a
 * second internal request that loses the original Host header, which breaks tenant lookup.
 */
export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  // The tenant always comes from the request host, never from a form field.
  const tenant = await getCurrentTenant()
  if (!tenant) return { status: 'error' }

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if (clean(formData.get('website'), 100)) return { status: 'sent' }

  const values = {
    name: clean(formData.get('name'), 120),
    phone: clean(formData.get('phone'), 40),
    email: clean(formData.get('email'), 200),
    message: clean(formData.get('message'), 2000),
  }
  if (!values.name || !values.phone || !values.message) return { status: 'error', values }

  const productSlug = clean(formData.get('product'), 200)
  const product = productSlug ? await getPublicProduct(tenant, productSlug) : null

  const payload = await getPayloadClient()
  await payload.create({
    collection: 'enquiries',
    data: {
      tenant: tenant.id,
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      message: values.message,
      product: product?.id,
    },
    // TODO: rate-limit per IP + add Cloudflare Turnstile, then email the client (Resend).
  })

  return { status: 'sent', values, productName: product?.name }
}
