import type { CollectionConfig } from 'payload'

import { idOf, loggedIn } from '../access'
import { refreshCatalogue } from '../lib/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: {
    afterChange: [({ doc }) => (refreshCatalogue(idOf(doc.tenant)), doc)],
    afterDelete: [({ doc }) => refreshCatalogue(idOf(doc.tenant))],
  },
  access: {
    // Images are not secret: the public site needs them. Prices are what we protect, not photos.
    read: () => true,
    create: loggedIn,
    update: loggedIn,
    delete: loggedIn,
  },
  upload: {
    // TODO: swap local disk for S3 / Cloudflare R2 storage adapter before deploying.
    mimeTypes: ['image/*', 'application/pdf'],
    imageSizes: [
      { name: 'thumbnail', width: 320, height: 320, fit: 'cover' },
      { name: 'card', width: 640, height: 480, fit: 'cover' },
    ],
    formatOptions: { format: 'webp' },
  },
  fields: [{ name: 'alt', type: 'text' }],
}
