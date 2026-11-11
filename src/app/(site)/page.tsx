import { SECTION_COMPONENTS } from '@/components/sections'
import { getCurrentTenant } from '@/lib/tenant'

const DEFAULT_SECTIONS = ['hero', 'stats', 'explore', 'features', 'products', 'brands', 'howToOrder', 'contact']

export default async function HomePage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  // Sections render in the order (and only the ones) configured for this tenant.
  // Each section is full-width and brings its own container, like the reference page.
  const keys = tenant.sections?.length ? tenant.sections : DEFAULT_SECTIONS

  return (
    <>
      {keys.map((key) => {
        const Section = SECTION_COMPONENTS[key]
        return Section ? <Section key={key} tenant={tenant} keys={keys} /> : null
      })}
    </>
  )
}
