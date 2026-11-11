import { ArrowRight, Building2, FileText, Layers, Package, Phone, Search, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import type { ReactElement, ReactNode } from 'react'

import { getCatalogues } from '@/lib/catalogues'
import { getCatalogue, getPublicProducts } from '@/lib/products'
import { siteConfig } from '@/lib/site'
import type { Media } from '@/payload-types'
import type { SiteTenant } from '@/lib/tenant'

import Carousel from './Carousel'
import ContactBlock from './ContactBlock'
import HeroSlider from './HeroSlider'
import { ProductCard } from './ProductCard'

export type SectionProps = {
  tenant: SiteTenant
  /** Sections enabled for this tenant, so a section can link to another one (e.g. the enquiry form). */
  keys: string[]
}

const mediaOf = (m: number | Media | null | undefined): Media | null =>
  m && typeof m === 'object' ? m : null

const Heading = ({ children, className = 'mb-12' }: { children: ReactNode; className?: string }) => (
  <h2 className={`text-center text-3xl font-bold ${className}`}>{children}</h2>
)

/* ------------------------------------------------------------------ Hero */

function Hero({ tenant, keys }: SectionProps) {
  const images = (tenant.home?.heroImages ?? []).flatMap((row) => {
    const m = mediaOf(row.image)
    return m?.url ? [{ url: m.url, alt: m.alt || tenant.name }] : []
  })
  const headline = tenant.home?.heroHeadline || tenant.name
  const sub = tenant.home?.heroSubheadline || tenant.profile?.tagline
  const enquiryHref = keys.includes('contact') ? '#enquiry' : '/contact'

  return (
    <section className="relative grid min-h-[80vh] sm:h-screen">
      <div className="absolute inset-0 z-0 bg-primary-dark">
        {images.length > 0 && (
          <HeroSlider
            images={images}
            overlay={Math.min(90, Math.max(0, tenant.home?.heroOverlay ?? 50))}
            delayMs={Math.min(15, Math.max(2, tenant.home?.heroDelay ?? 3)) * 1000}
          />
        )}
      </div>

      {/* pointer-events-none lets visitors reach the slideshow dots underneath the text block */}
      <div className="pointer-events-none relative z-20 flex min-h-[80vh] items-center justify-center sm:h-screen">
        <div className="container mx-auto px-4 text-white">
          <div className="pointer-events-auto max-w-3xl p-8">
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">{headline}</h1>
            {sub && <p className="mb-8 text-lg leading-relaxed opacity-95 md:text-xl lg:text-2xl">{sub}</p>}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-lg font-medium text-white transition-all duration-300 hover:bg-primary-dark motion-safe:hover:scale-105"
              >
                <ShoppingBag className="mr-2 h-5 w-5" aria-hidden />
                Browse Products
              </Link>
              {tenant.profile?.showEnquiryButton !== false && (
                <Link
                  href={enquiryHref}
                  className="inline-flex items-center justify-center rounded-md border-2 border-white bg-transparent px-8 py-4 text-lg font-medium text-white transition-all duration-300 hover:bg-white hover:text-primary motion-safe:hover:scale-105"
                >
                  <Phone className="mr-2 h-5 w-5" aria-hidden />
                  Request Enquiry
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Features */

function FeatureCard({ icon, title, description }: { icon?: string | null; title: string; description?: string | null }) {
  return (
    <div className="h-full rounded-lg border border-gray-200 bg-white p-8 text-center transition-shadow hover:shadow-lg">
      {icon && (
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
          <span className="text-3xl" aria-hidden>
            {icon}
          </span>
        </div>
      )}
      <h3 className="mb-4 text-2xl font-semibold">{title}</h3>
      {description && <p className="leading-relaxed text-gray-600">{description}</p>}
    </div>
  )
}

function Features({ tenant }: SectionProps) {
  const items = tenant.home?.features ?? []
  if (!items.length) return null
  const cards = items.map((f) => <FeatureCard key={f.id ?? f.title} icon={f.icon} title={f.title} description={f.description} />)

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold">{tenant.home?.featuresHeading || 'Why Choose Us?'}</h2>
          {tenant.home?.featuresIntro && (
            <p className="mx-auto max-w-2xl text-xl text-gray-600">{tenant.home.featuresIntro}</p>
          )}
        </div>

        <div className="lg:hidden">
          <Carousel loop={items.length > 1}>{cards}</Carousel>
        </div>
        <div className="hidden gap-8 lg:grid lg:grid-cols-3">{cards}</div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- Counts */

const count = (n: number) => n.toLocaleString('en-IN')
const distinct = (values: (string | null)[]) => new Set(values.filter(Boolean).map((v) => (v as string).trim().toLowerCase())).size

/** Number of products, companies and categories on the site, from the published catalogue. */
async function Stats({ tenant }: SectionProps) {
  const products = await getCatalogue(tenant)
  if (!products.length) return null
  const stats = [
    { value: products.length, label: products.length === 1 ? 'Product' : 'Products', icon: Package, href: '/products' },
    { value: distinct(products.map((p) => p.company)), label: 'Companies', icon: Building2, href: '/products' },
    { value: distinct(products.map((p) => p.categoryName)), label: 'Categories', icon: Layers, href: '/products' },
  ].filter((s) => s.value > 0)

  return (
    <section className="border-b bg-white py-10" aria-label="At a glance">
      <div className="container mx-auto px-4">
        <dl className={`mx-auto grid max-w-4xl gap-4 ${stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {stats.map(({ value, label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex items-center gap-4 rounded-xl border bg-gray-50 p-5 transition-colors hover:border-primary hover:bg-primary-soft"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <dd className="text-3xl font-bold leading-none text-gray-900">{count(value)}</dd>
                <dt className="mt-1 text-sm font-medium text-gray-600 group-hover:text-primary">{label}</dt>
              </span>
            </Link>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Explore */

function ExploreCard({
  icon: Icon,
  title,
  text,
  badges,
  href,
  cta,
}: {
  icon: typeof Search
  title: string
  text: string
  badges: string[]
  href: string
  cta: string
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="mb-4 flex-1 text-gray-600">{text}</p>
      <div className="mb-6 flex flex-wrap gap-2">
        {badges.map((b) => (
          <span key={b} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {b}
          </span>
        ))}
      </div>
      <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-white transition-colors hover:bg-primary-dark">
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}

/** "Two ways to explore": the product search, and the company-wise PDF catalogues (if switched on). */
async function Explore({ tenant }: SectionProps) {
  const [products, catalogues] = await Promise.all([getCatalogue(tenant), getCatalogues(tenant)])
  if (!products.length && !catalogues.length) return null
  const site = siteConfig(tenant)
  const companies = new Set(catalogues.map((c) => c.company.trim().toLowerCase())).size

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <Heading className="mb-3">What do you need?</Heading>
        <p className="mb-10 text-center text-gray-600">Search the full product list, or open a company's catalogue.</p>
        <div className={`mx-auto grid gap-6 ${catalogues.length ? 'max-w-5xl md:grid-cols-2' : 'max-w-xl'}`}>
          {products.length > 0 && (
            <ExploreCard
              icon={Search}
              title="Product Search"
              text="Search by name, salt or company, and filter by company, division, category and form."
              badges={[`${count(products.length)} products`, 'Live search', ...(site.cartEnabled && site.whatsapp ? ['WhatsApp order'] : [])]}
              href="/products"
              cta="Open product search"
            />
          )}
          {catalogues.length > 0 && (
            <ExploreCard
              icon={FileText}
              title="Product Catalogues"
              text="Company-wise PDF product lists. View them in the browser, download, or share on WhatsApp."
              badges={[`${companies} ${companies === 1 ? 'company' : 'companies'}`, `${catalogues.length} PDFs`, 'Download & share']}
              href="/catalogues"
              cta="View catalogues"
            />
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- New arrivals */

// "New arrival" is the checkbox stored as `isFeatured` on a product (see Products collection).
async function NewArrivals({ tenant }: SectionProps) {
  const items = await getPublicProducts(tenant, { featuredOnly: true, limit: 12 })
  if (!items.length) return null
  const { catalogue } = siteConfig(tenant)
  const cardOptions = { showCompany: catalogue.showCompany, showPacking: catalogue.showPacking }

  const cards = items.map((p) => (
    <div key={p.id} className="h-full px-2">
      <ProductCard product={p} options={cardOptions} />
    </div>
  ))

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <Heading>{tenant.home?.newArrivalsHeading || 'New Arrivals'}</Heading>

        {items.length > 4 ? (
          <Carousel
            autoplayMs={1500}
            loop
            breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 }, 1280: { slidesPerView: 4 } }}
          >
            {cards}
          </Carousel>
        ) : (
          <>
            <div className="md:hidden">
              <Carousel loop={items.length > 2} breakpoints={{ 640: { slidesPerView: 2 } }}>
                {cards}
              </Carousel>
            </div>
            <div className="hidden gap-8 md:grid md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} options={cardOptions} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- Brands */

function Brands({ tenant }: SectionProps) {
  const brands = (tenant.home?.brands ?? []).map((b) => ({ id: b.id ?? b.name, name: b.name, logo: mediaOf(b.logo) }))
  if (!brands.length) return null

  const tiles = brands.map((b) => (
    <div key={b.id} className="px-4">
      <div className="flex h-24 items-center justify-center rounded-lg bg-white p-4">
        {b.logo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.logo.sizes?.card?.url ?? b.logo.url} alt={b.name} className="max-h-16 max-w-full object-contain" />
        ) : (
          <span className="font-semibold text-gray-600">{b.name}</span>
        )}
      </div>
    </div>
  ))

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <Heading>{tenant.home?.brandsHeading || 'Brands'}</Heading>
        {brands.length > 4 ? (
          <Carousel
            autoplayMs={2000}
            loop
            breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 }, 1280: { slidesPerView: 4 } }}
          >
            {tiles}
          </Carousel>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{tiles}</div>
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- How to order */

function StepCard({ step, title, description }: { step: number; title: string; description?: string | null }) {
  return (
    <div className="h-full rounded-lg bg-white p-6 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <span className="text-2xl">{step}</span>
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      {description && <p className="text-gray-600">{description}</p>}
    </div>
  )
}

function HowToOrder({ tenant }: SectionProps) {
  const steps = tenant.home?.steps ?? []
  if (!steps.length) return null
  const cards = steps.map((s, i) => <StepCard key={s.id ?? s.title} step={i + 1} title={s.title} description={s.description} />)

  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto px-4">
        <Heading>{tenant.home?.stepsHeading || 'How to Order'}</Heading>
        <div className="lg:hidden">
          <Carousel loop={steps.length > 1} breakpoints={{ 768: { slidesPerView: 2 } }}>
            {cards}
          </Carousel>
        </div>
        <div className="hidden gap-8 lg:grid lg:grid-cols-4">{cards}</div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------- About / certificates */

function About({ tenant }: SectionProps) {
  if (!tenant.profile?.about) return null
  return (
    <section className="bg-white py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <Heading className="mb-6">About Us</Heading>
        <p className="whitespace-pre-line text-lg leading-relaxed text-gray-600">{tenant.profile.about}</p>
      </div>
    </section>
  )
}

function Certifications({ tenant }: SectionProps) {
  const items = tenant.profile?.certifications ?? []
  if (!items.length) return null
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto px-4">
        <Heading>Certifications</Heading>
        <ul className="flex flex-wrap justify-center gap-3">
          {items.map((c) => (
            <li key={c.id ?? c.title} className="rounded-full bg-white px-5 py-2 font-medium shadow-sm">
              {c.title}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- Contact */

function Contact({ tenant }: SectionProps) {
  return (
    <section id="enquiry" className="scroll-mt-16 bg-white py-16">
      <div className="container mx-auto px-4">
        <ContactBlock tenant={tenant} />
      </div>
    </section>
  )
}

/** Keys must match the `sections` options on the Tenants collection. */
export const SECTION_COMPONENTS: Record<
  string,
  (props: SectionProps) => ReactElement | null | Promise<ReactElement | null>
> = {
  hero: Hero,
  stats: Stats,
  explore: Explore,
  features: Features,
  products: NewArrivals,
  brands: Brands,
  howToOrder: HowToOrder,
  about: About,
  certifications: Certifications,
  contact: Contact,
}
