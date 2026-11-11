'use client'

import { Loader2 } from 'lucide-react'
import { useActionState } from 'react'

import { submitEnquiry, type EnquiryState } from '@/app/(site)/contact/actions'
import { whatsappLink } from '@/lib/site'

import BrandIcon from './BrandIcon'
import { buttonClass, Card, CardContent, CardHeader, CardTitle, inputClass } from './ui'

const label = 'mb-2 block text-sm font-medium'

/**
 * The reference's "Send Us an Enquiry" card. The enquiry is always saved in the dashboard;
 * if the client turned it on, the visitor also gets a button to continue on WhatsApp with the
 * message already written.
 */
export default function EnquiryForm({
  product,
  productName,
  whatsapp,
  siteName,
}: {
  product?: string
  productName?: string
  whatsapp: string | null
  siteName: string
}) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, { status: 'idle' })
  const v = state.status === 'error' ? state.values : undefined

  const waText =
    state.status === 'sent' && state.values
      ? [
          `🔍 ${state.productName ? 'Product' : 'General'} Enquiry for ${siteName}`,
          '',
          ...[
            `Name: ${state.values.name}`,
            state.values.phone && `Phone: ${state.values.phone}`,
            state.values.email && `Email: ${state.values.email}`,
            state.productName && `Product: ${state.productName}`,
            `Message: ${state.values.message}`,
          ].filter((l): l is string => Boolean(l)),
        ].join('\n')
      : null
  const wa = waText ? whatsappLink(whatsapp, waText) : null

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Send Us an Enquiry</CardTitle>
        {productName && <p className="text-sm text-gray-600">About: {productName}</p>}
      </CardHeader>
      <CardContent>
        {state.status === 'sent' && (
          <div role="status" className="mb-4 space-y-3 rounded-md bg-green-50 p-3 text-green-800">
            <p>Thank you. We have received your enquiry and will get back to you soon.</p>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass('whatsapp', 'sm')}>
                <BrandIcon name="whatsapp" className="h-4 w-4" />
                Also send it on WhatsApp
              </a>
            )}
          </div>
        )}
        {state.status === 'error' && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-red-800">
            Please enter your name, phone number and a message.
          </p>
        )}

        <form action={action} className="space-y-4">
          <input type="hidden" name="product" value={product ?? ''} />
          {/* Honeypot: invisible to people, tempting to bots. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px]" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="enq-name" className={label}>
                Name *
              </label>
              <input id="enq-name" name="name" required maxLength={120} autoComplete="name" defaultValue={v?.name} disabled={pending} className={inputClass} />
            </div>
            <div>
              <label htmlFor="enq-email" className={label}>
                Email
              </label>
              <input id="enq-email" name="email" type="email" maxLength={200} autoComplete="email" defaultValue={v?.email} disabled={pending} className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="enq-phone" className={label}>
              Phone *
            </label>
            <input id="enq-phone" name="phone" type="tel" required maxLength={40} autoComplete="tel" defaultValue={v?.phone} disabled={pending} className={inputClass} />
          </div>

          <div>
            <label htmlFor="enq-message" className={label}>
              Your Message *
            </label>
            <textarea
              id="enq-message"
              name="message"
              rows={4}
              required
              maxLength={2000}
              placeholder="How can we help you?"
              defaultValue={v?.message}
              disabled={pending}
              className={`${inputClass} h-auto min-h-[80px]`}
            />
          </div>

          <button type="submit" disabled={pending} className={buttonClass('default', 'default', 'w-full')}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Submitting...
              </>
            ) : (
              'Submit Enquiry'
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
