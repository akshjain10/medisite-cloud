import type { CollectionConfig } from 'payload'

import { loggedIn, nobody } from '../access'

export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'phone', 'status', 'createdAt'] },
  access: {
    // Created only by the website's server action (Local API). Never directly over REST.
    create: nobody,
    read: loggedIn,
    update: loggedIn,
    delete: loggedIn,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'message', type: 'textarea', required: true },
    { name: 'product', type: 'relationship', relationTo: 'products' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: ['new', 'contacted', 'closed'],
    },
  ],
}
