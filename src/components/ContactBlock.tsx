import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import type { ReactNode } from 'react'

import { siteConfig } from '@/lib/site'
import type { Tenant } from '@/payload-types'

import EnquiryForm from './EnquiryForm'

function ContactRow({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start">
      <span className="mr-4 mt-1 text-primary" aria-hidden>
        {icon}
      </span>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-gray-600">{children}</div>
      </div>
    </div>
  )
}

/** Contact details beside the enquiry form, as in the reference's contact section. */
export default function ContactBlock({
  tenant,
  product,
  asPageTitle = false,
}: {
  tenant: Tenant
  product?: { slug: string; name: string } | null
  asPageTitle?: boolean
}) {
  const site = siteConfig(tenant)
  const home = tenant.home ?? {}
  const hasInfo = site.phone || site.email || site.businessHours || site.address
  const Title = asPageTitle ? 'h1' : 'h2'

  return (
    <div className={`grid grid-cols-1 gap-12 ${hasInfo && site.showEnquiry ? 'lg:grid-cols-2' : ''}`}>
      {hasInfo && (
        <div>
          <Title className="mb-6 text-3xl font-bold">{home.contactHeading || 'Contact Us'}</Title>
          {home.contactIntro && <p className="mb-8 text-lg text-gray-600">{home.contactIntro}</p>}
          <div className="space-y-6">
            {site.phone && (
              <ContactRow icon={<Phone />} title="Phone">
                <a href={`tel:${site.phone.replace(/[^\d+]/g, '')}`} className="hover:text-primary">
                  {site.phone}
                </a>
                {site.phoneNote && <p>{site.phoneNote}</p>}
              </ContactRow>
            )}
            {site.email && (
              <ContactRow icon={<Mail />} title="Email">
                <a href={`mailto:${site.email}`} className="break-all hover:text-primary">
                  {site.email}
                </a>
                {site.emailNote && <p>{site.emailNote}</p>}
              </ContactRow>
            )}
            {site.businessHours && (
              <ContactRow icon={<Clock />} title="Business Hours">
                <p className="whitespace-pre-line">{site.businessHours}</p>
              </ContactRow>
            )}
            {site.address && (
              <ContactRow icon={<MapPin />} title="Address">
                <p className="whitespace-pre-line">{site.address}</p>
              </ContactRow>
            )}
          </div>
        </div>
      )}
      {site.showEnquiry && (
        <EnquiryForm product={product?.slug} productName={product?.name} whatsapp={site.enquiryViaWhatsapp ? site.whatsapp : null} siteName={site.name} />
      )}
    </div>
  )
}
