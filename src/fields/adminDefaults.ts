import type { CollectionConfig, Field } from 'payload'

const SWITCH = '/components/admin/fields/SwitchField#default'

/** Give every yes/no (checkbox) field the on/off switch, however deeply it is nested. */
function switchify(fields: Field[]): Field[] {
  return fields.map((f) => {
    if (f.type === 'checkbox') {
      return f.admin?.components?.Field ? f : { ...f, admin: { ...f.admin, components: { ...f.admin?.components, Field: SWITCH } } }
    }
    if ('fields' in f && Array.isArray(f.fields)) return { ...f, fields: switchify(f.fields) } as Field
    if (f.type === 'tabs') return { ...f, tabs: f.tabs.map((t) => ({ ...t, fields: switchify(t.fields) })) }
    return f
  })
}

/** Admin-wide defaults: switches for yes/no fields, and no "API" tab on documents. */
export const withAdminDefaults = (c: CollectionConfig): CollectionConfig => ({
  ...c,
  admin: { ...c.admin, hideAPIURL: true },
  fields: switchify(c.fields),
})
