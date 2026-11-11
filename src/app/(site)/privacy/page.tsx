import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageShell } from '@/components/PageShell'
import { siteConfig, type SiteConfig } from '@/lib/site'
import { getCurrentTenant } from '@/lib/tenant'

export const metadata: Metadata = { title: 'Privacy Policy' }

/** Default text. It describes what this platform actually does, so it stays accurate. */
function defaultPolicy(site: SiteConfig) {
  return `At ${site.name}, your privacy is important to us. This website shows our range of products and lets you contact us.

## 1. Information you send us
When you use the enquiry form we receive the name, phone number, email address and message you type. We use them only to reply to your enquiry and we keep them only as long as needed for that.

## 2. Orders and WhatsApp
${site.cartEnabled ? 'Your cart is stored only in your own browser. When you choose to send an order, it opens in WhatsApp and nothing is sent until you press send there. Anything you share on WhatsApp is handled by WhatsApp under its own terms.' : 'If you contact us on WhatsApp, anything you share there is handled by WhatsApp under its own terms.'}

## 3. Sharing
We do not sell, rent or share your information with anyone for marketing.

## 4. Cookies
This website does not use advertising or analytics trackers. Your browser may store small settings, such as the contents of your cart.

## 5. Changes to this policy
If our practices change we will update this page.

## 6. Contact us
If you have any questions about this policy, please contact us using the details below.`
}

export default async function PrivacyPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null
  const site = siteConfig(tenant)
  if (!site.showPrivacy) notFound()

  const text = tenant.profile?.privacyPolicy?.trim() || defaultPolicy(site)
  const blocks = text.split(/\n\s*\n/)

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold text-primary">Privacy Policy</h1>
        {blocks.map((block, i) => {
          const [first, ...rest] = block.split('\n')
          if (first.startsWith('## ')) {
            return (
              <div key={i}>
                <h2 className="mb-2 text-xl font-semibold text-gray-800">{first.slice(3)}</h2>
                {rest.length > 0 && <p className="mb-6 whitespace-pre-line">{rest.join('\n')}</p>}
              </div>
            )
          }
          return (
            <p key={i} className="mb-6 whitespace-pre-line">
              {block}
            </p>
          )
        })}
        {(site.email || site.phone) && (
          <div className="rounded border bg-white p-4 shadow">
            <p className="font-semibold">{site.name}</p>
            {site.email && (
              <p>
                Email:{' '}
                <a href={`mailto:${site.email}`} className="text-primary">
                  {site.email}
                </a>
              </p>
            )}
            {site.phone && (
              <p>
                Phone:{' '}
                <a href={`tel:${site.phone.replace(/[^\d+]/g, '')}`} className="text-primary">
                  {site.phone}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}
