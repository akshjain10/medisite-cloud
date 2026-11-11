import type { CollectionConfig } from 'payload'

import { idOf, loggedIn } from '../access'
import { refreshCatalogue } from '../lib/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'sortOrder'] },
  hooks: {
    afterChange: [({ doc }) => (refreshCatalogue(idOf(doc.tenant)), doc)],
    afterDelete: [({ doc }) => refreshCatalogue(idOf(doc.tenant))],
  },
  access: { read: loggedIn, create: loggedIn, update: loggedIn, delete: loggedIn },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, index: true },
    { name: 'sortOrder', type: 'number', defaultValue: 0 },
  ],
}
