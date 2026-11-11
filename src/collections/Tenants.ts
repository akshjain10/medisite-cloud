import type { CollectionConfig, Field } from 'payload'

import { isPortalUser, portalOnlyField, portalOwnerOnly } from '../access'
import { LATEST_LEVEL } from '../lib/upgradeTenants'

/** Accepts #rrggbb only, so a client can never inject CSS through a colour field. */
const hexColor = (value: unknown) =>
  value == null || value === '' || (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value))
    ? true
    : 'Use a 6-digit hex colour such as #2563eb'

const colorField = (name: string, defaultValue: string, description: string, palette: 'brand' | 'accent'): Field => ({
  name,
  label: palette === 'brand' ? 'Brand colour' : 'Accent colour',
  type: 'text',
  defaultValue,
  validate: hexColor,
  admin: {
    description,
    // Palette of ready-made colours, custom colour and live preview (components/admin/fields/ColorField.tsx).
    components: { Field: { path: '/components/admin/fields/ColorField#default', clientProps: { palette } } },
  },
})

/**
 * One document per client website.
 * Fields in "Platform settings" are controlled by you; everything in the tabs the client edits.
 *
 * The tabs are unnamed, so they only organise the admin screen: field paths in the database
 * (theme.*, home.*, profile.*) are unchanged from earlier versions.
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'domain', 'plan'] },
  hooks: {
    // A new client already has every upgrade in lib/upgradeTenants.ts (its defaults are current).
    beforeChange: [({ data, operation }) => (operation === 'create' ? { ...data, upgradeLevel: LATEST_LEVEL } : data)],
  },
  access: {
    // Only the Portal Super Owner adds or removes client sites.
    create: portalOwnerOnly,
    delete: portalOwnerOnly,
    // read/update are narrowed to the user's own tenants by the multi-tenant plugin.
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    // Which automatic upgrades (lib/upgradeTenants.ts) this client has had. Not shown in the admin.
    { name: 'upgradeLevel', type: 'number', defaultValue: 0, admin: { hidden: true } },

    // ---- Controlled by you ----
    {
      type: 'collapsible',
      label: 'Platform settings (portal staff only)',
      admin: { condition: (_data, _siblings, { user }) => isPortalUser(user) },
      fields: [
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: {
            description:
              'Lowercase letters, numbers and hyphens. The site opens at <slug>.yourplatform.com. Cleaned up automatically on save.',
          },
          hooks: {
            // "Arihant Medigens" -> "arihant-medigens". Host names are lowercase and cannot contain
            // spaces or underscores, so the slug must be stored in that form to ever match.
            beforeValidate: [
              ({ value }) =>
                typeof value === 'string'
                  ? value
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '')
                  : value,
            ],
          },
          access: { update: portalOnlyField },
        },
        {
          name: 'domain',
          type: 'text',
          unique: true,
          admin: { description: 'Custom domain, e.g. arihantmedigens.com (no https://, no www).' },
          access: { update: portalOnlyField },
        },
        {
          name: 'plan',
          type: 'select',
          defaultValue: 'basic',
          options: ['basic', 'pro', 'premium'],
          access: { update: portalOnlyField },
        },
      ],
    },

    // ---- Edited by the client ----
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Site options',
          description: 'How prices, ordering and the home page work on this site.',
          fields: [
            {
              name: 'priceMode',
              type: 'select',
              defaultValue: 'hidden',
              required: true,
              options: [
                { label: 'Show prices', value: 'visible' },
                { label: 'Lock prices: visitors enter a password to see them', value: 'locked' },
                { label: 'Hide prices', value: 'hidden' },
                { label: 'Show "Request a quote" instead of prices', value: 'quote' },
                { label: 'Prices for logged-in distributors only (not built yet)', value: 'login' },
              ],
            },
            {
              name: 'pricePassword',
              label: 'Price password',
              type: 'text',
              admin: {
                condition: (data) => data?.priceMode === 'locked',
                description:
                  'Share this with your customers. Visitors type it once to see prices for 30 days on that browser. Changing it locks everyone out again. People who log in to this dashboard always see prices.',
              },
              validate: (value: unknown, { siblingData }: { siblingData?: { priceMode?: string } }) =>
                siblingData?.priceMode !== 'locked' || (typeof value === 'string' && value.trim().length >= 4) || 'Set a password of at least 4 characters to lock prices.',
            },
            {
              name: 'lockMrp',
              type: 'checkbox',
              defaultValue: false,
              label: 'Also lock the MRP',
              admin: {
                condition: (data) => data?.priceMode === 'locked',
                description: 'Off: the MRP stays visible and only your selling price is locked.',
              },
            },
            {
              name: 'showCatalogues',
              type: 'checkbox',
              defaultValue: true,
              label: 'Company-wise PDF catalogues',
              admin: {
                description:
                  'Adds a Catalogues page (view, download and share PDFs), a menu link and a home page card. Upload the PDFs under Catalogues in the menu. Nothing shows until at least one is uploaded.',
              },
            },
            {
              name: 'enableCart',
              type: 'checkbox',
              defaultValue: true,
              label: 'Cart and online ordering',
              admin: {
                description:
                  'Adds a cart, an Order page and "Add to Cart" buttons. Customers send their order on WhatsApp (set a WhatsApp number under Contact & footer).',
              },
            },
            {
              name: 'sections',
              type: 'select',
              hasMany: true,
              admin: { isSortable: true, description: 'Home page sections, in display order.' },
              defaultValue: ['hero', 'stats', 'explore', 'features', 'products', 'brands', 'howToOrder', 'contact'],
              options: [
                { label: 'Hero banner', value: 'hero' },
                { label: 'Counts: products, companies, categories', value: 'stats' },
                { label: 'Explore cards: product search and catalogues', value: 'explore' },
                { label: 'Why choose us', value: 'features' },
                { label: 'New arrivals', value: 'products' },
                { label: 'Brands', value: 'brands' },
                { label: 'How to order', value: 'howToOrder' },
                { label: 'About us', value: 'about' },
                { label: 'Certifications', value: 'certifications' },
                { label: 'Contact + enquiry form', value: 'contact' },
              ],
            },
          ],
        },
        {
          label: 'Branding',
          fields: [
            { name: 'logo', type: 'upload', relationTo: 'media', admin: { description: 'Square or wide PNG with a transparent background works best.' } },
            {
              name: 'theme',
              type: 'group',
              label: false,
              fields: [
                {
                  type: 'row',
                  fields: [
                    colorField('primaryColor', '#2563eb', 'Buttons, links, prices and highlights.', 'brand'),
                    colorField('accentColor', '#c084fc', 'The round call / WhatsApp button.', 'accent'),
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fontPreset',
                      type: 'select',
                      defaultValue: 'sans',
                      label: 'Font',
                      // 'sans' and 'serif' keep their stored values from earlier versions.
                      options: [
                        { label: 'Inter (default)', value: 'sans' },
                        { label: 'Poppins', value: 'poppins' },
                        { label: 'Roboto', value: 'roboto' },
                        { label: 'Montserrat', value: 'montserrat' },
                        { label: 'Open Sans', value: 'open-sans' },
                        { label: 'Nunito', value: 'nunito' },
                        { label: 'Merriweather (serif)', value: 'serif' },
                      ],
                    },
                    {
                      name: 'corners',
                      type: 'select',
                      defaultValue: 'rounded',
                      options: [
                        { label: 'Rounded (default)', value: 'rounded' },
                        { label: 'Soft (extra round)', value: 'soft' },
                        { label: 'Square', value: 'square' },
                      ],
                    },
                    {
                      name: 'footerStyle',
                      type: 'select',
                      defaultValue: 'dark',
                      options: [
                        { label: 'Dark (default)', value: 'dark' },
                        { label: 'Brand colour', value: 'brand' },
                        { label: 'Light', value: 'light' },
                      ],
                    },
                  ],
                },
                {
                  name: 'showNameInHeader',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Show company name next to the logo',
                },
                {
                  name: 'splashScreen',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'Show a logo splash screen on the first visit',
                  admin: { description: 'Shown once per browser session, for about 2 seconds.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Home page',
          fields: [
            {
              name: 'home',
              type: 'group',
              label: false,
              admin: { description: 'Sections with no content are hidden automatically.' },
              fields: [
                { name: 'heroHeadline', type: 'text', admin: { description: 'Defaults to the company name.' } },
                { name: 'heroSubheadline', type: 'textarea', admin: { description: 'Defaults to the tagline.' } },
                {
                  name: 'heroImages',
                  type: 'array',
                  maxRows: 6,
                  labels: { singular: 'Hero image', plural: 'Hero images' },
                  admin: { description: 'Landscape photos, about 1920 x 1080. Several images make a slideshow.' },
                  fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'heroOverlay',
                      type: 'number',
                      min: 0,
                      max: 90,
                      defaultValue: 50,
                      label: 'Hero image darkness (%)',
                      admin: { description: 'Darker makes white text easier to read.' },
                    },
                    {
                      name: 'heroDelay',
                      type: 'number',
                      min: 2,
                      max: 15,
                      defaultValue: 3,
                      label: 'Seconds per hero slide',
                    },
                  ],
                },
                { name: 'featuresHeading', type: 'text', defaultValue: 'Why Choose Us?' },
                { name: 'featuresIntro', type: 'textarea' },
                {
                  name: 'features',
                  type: 'array',
                  maxRows: 6,
                  labels: { singular: 'Feature', plural: 'Features' },
                  defaultValue: [
                    { icon: '🚚', title: 'Fast Delivery', description: 'Quick and reliable delivery across the region.' },
                    { icon: '✅', title: 'Quality Products', description: 'Genuine products sourced from trusted manufacturers.' },
                    { icon: '💬', title: 'Responsive Support', description: 'Our team is ready to help with your queries.' },
                  ],
                  fields: [
                    { name: 'icon', type: 'text', admin: { description: 'One emoji, e.g. 🚚' } },
                    { name: 'title', type: 'text', required: true },
                    { name: 'description', type: 'textarea' },
                  ],
                },
                { name: 'newArrivalsHeading', type: 'text', defaultValue: 'New Arrivals' },
                { name: 'brandsHeading', type: 'text', defaultValue: 'Brands' },
                {
                  name: 'brands',
                  type: 'array',
                  labels: { singular: 'Brand', plural: 'Brands' },
                  fields: [
                    { name: 'name', type: 'text', required: true },
                    { name: 'logo', type: 'upload', relationTo: 'media' },
                  ],
                },
                { name: 'stepsHeading', type: 'text', defaultValue: 'How to Order' },
                {
                  name: 'steps',
                  type: 'array',
                  maxRows: 6,
                  labels: { singular: 'Step', plural: 'How to order steps' },
                  defaultValue: [
                    { title: 'Browse Products', description: 'Explore our range of products.' },
                    { title: 'Send an Enquiry', description: 'Tell us what you need using the enquiry form or WhatsApp.' },
                    { title: 'Confirmation', description: 'Our team confirms availability and details with you.' },
                    { title: 'Delivery', description: 'Make payment and receive your order.' },
                  ],
                  fields: [
                    { name: 'title', type: 'text', required: true },
                    { name: 'description', type: 'textarea' },
                  ],
                },
                { name: 'contactHeading', type: 'text', defaultValue: 'Contact Us' },
                {
                  name: 'contactIntro',
                  type: 'textarea',
                  defaultValue:
                    'Have questions or need assistance? Our team is ready to help you with any enquiries about our products and services.',
                },
              ],
            },
          ],
        },
        {
          label: 'Contact & footer',
          fields: [
            {
              name: 'profile',
              type: 'group',
              label: false,
              fields: [
                { name: 'tagline', type: 'text', admin: { description: 'One line about the company. Used in the hero and footer.' } },
                { name: 'about', type: 'textarea' },
                {
                  type: 'row',
                  fields: [
                    { name: 'phone', type: 'text' },
                    { name: 'phoneNote', type: 'text', admin: { description: 'Shown under the phone number, e.g. Mon-Sat: 9AM - 7PM' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'email', type: 'email' },
                    { name: 'emailNote', type: 'text', admin: { description: 'e.g. Response within 24 hours' } },
                  ],
                },
                { name: 'whatsapp', type: 'text', admin: { description: 'Digits only with country code, e.g. 919876543210. Needed for WhatsApp orders and enquiries.' } },
                { name: 'address', type: 'textarea' },
                { name: 'mapUrl', type: 'text', label: 'Google Maps link', validate: (v: unknown) => !v || (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) || 'Paste a full link starting with https://', admin: { description: 'Opens when visitors click the address. Paste the "Share" link from Google Maps.' } },
                { name: 'businessHours', type: 'textarea', admin: { description: 'One line per row, e.g. Mon-Sat: 9AM - 7PM' } },
                {
                  type: 'row',
                  fields: [
                    { name: 'drugLicenseNumber', type: 'text' },
                    { name: 'gstNumber', type: 'text' },
                  ],
                },
                { name: 'certifications', type: 'array', fields: [{ name: 'title', type: 'text', required: true }] },
                { name: 'footerDescription', type: 'textarea', admin: { description: 'Text under the logo in the footer. Defaults to the tagline.' } },
                { name: 'showWhatsappButton', type: 'checkbox', defaultValue: true, label: 'Show the floating call / WhatsApp button' },
                { name: 'showEnquiryButton', type: 'checkbox', defaultValue: true, label: 'Show enquiry buttons and forms' },
                {
                  name: 'enquiryViaWhatsapp',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'After an enquiry is sent, offer to continue on WhatsApp',
                  admin: { description: 'The enquiry is always saved in the dashboard. This adds a WhatsApp button with the message filled in.' },
                },
                { name: 'showPrivacyPolicy', type: 'checkbox', defaultValue: true, label: 'Show a Privacy Policy page in the footer' },
                {
                  name: 'privacyPolicy',
                  type: 'textarea',
                  admin: {
                    description: 'Leave empty to use a standard policy with your company details. Blank lines start new paragraphs; a line starting with "## " is a heading.',
                    condition: (_d, siblings) => siblings?.showPrivacyPolicy !== false,
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Catalogue',
          fields: [
            {
              name: 'catalogue',
              type: 'group',
              label: false,
              fields: [
                {
                  name: 'productsPerPage',
                  type: 'select',
                  defaultValue: '25',
                  options: ['25', '50', '100'],
                  admin: { description: 'Visitors can still change this on the products page.' },
                },
                { name: 'showCompany', type: 'checkbox', defaultValue: true, label: 'Show company / manufacturer on product cards' },
                { name: 'showPacking', type: 'checkbox', defaultValue: true, label: 'Show packing on product cards' },
                { name: 'showShare', type: 'checkbox', defaultValue: true, label: 'Show a Share button on product pages' },
                { name: 'showSimilar', type: 'checkbox', defaultValue: true, label: 'Show similar products on product pages' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
