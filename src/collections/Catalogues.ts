import type { CollectionConfig } from 'payload'

import { loggedIn } from '../access'

/**
 * Company-wise PDF catalogues (one row per PDF), shown on the public /catalogues page where
 * visitors can view, download and share them. Switched on per site with "Company-wise PDF
 * catalogues" in the client's Site options.
 */
export const Catalogues: CollectionConfig = {
  slug: 'catalogues',
  labels: { singular: 'Catalogue', plural: 'Catalogues' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'company', 'division', 'updatedLabel', 'visible'],
    description: 'Company-wise PDF product lists. Visitors can view, download and share them on the Catalogues page.',
  },
  // The public page reads through the Local API (lib/catalogues.ts); the PDFs themselves are
  // public files, like product images.
  access: { read: loggedIn, create: loggedIn, update: loggedIn, delete: loggedIn },
  defaultSort: 'sortOrder',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'company', type: 'text', required: true, admin: { width: '50%', description: 'e.g. Alkem Laboratories' } },
        { name: 'division', type: 'text', admin: { width: '50%', description: 'e.g. Healthcare. Leave empty for the whole company.' } },
      ],
    },
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Shown as the card heading. Defaults to the division, or the company.' },
      hooks: {
        beforeValidate: [({ value, siblingData }) => (typeof value === 'string' && value.trim()) || siblingData?.division || siblingData?.company || value],
      },
    },
    {
      name: 'file',
      label: 'PDF file',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: { mimeType: { equals: 'application/pdf' } },
      admin: { description: 'Upload a PDF. It is public: anyone with the link can open it.' },
    },
    { name: 'description', type: 'textarea', admin: { rows: 2, description: 'One line, e.g. "Full product list with MRP".' } },
    {
      type: 'row',
      fields: [
        { name: 'updatedLabel', label: 'Updated', type: 'text', admin: { width: '50%', description: 'e.g. FY 2025–26 or Nov 2026' } },
        { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { width: '25%' } },
        { name: 'visible', label: 'Show on website', type: 'checkbox', defaultValue: true, admin: { width: '25%' } },
      ],
    },
  ],
}
