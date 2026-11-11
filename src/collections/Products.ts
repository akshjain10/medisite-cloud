import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type FieldHook,
} from 'payload'

import { canManageTenant, deleteInOwnedTenants, idOf, loggedIn, portalOrAnyTenantOwner } from '../access'
import { importProductsEndpoint } from '../endpoints/importProducts'
import { refreshCatalogue } from '../lib/revalidate'
import { slugify } from '../lib/slugify'

/** Tenant Editors may edit products but not add them (deleting is blocked by access rules). */
const onlyOwnersAdd: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && req.user && !canManageTenant(req.user, idOf(data.tenant)))
    throw new APIError("Tenant Editors can't add products. Ask your Tenant Super Owner.", 403, undefined, true)
  return data
}

/**
 * Web address for the product page, made from the name and kept unique within the tenant
 * (e.g. two "DOLO 650" products become dolo-650 and dolo-650-<id>). The importer works out
 * slugs for a whole batch itself and sets context.slugsResolved to skip the per-row lookup.
 */
const uniqueSlug: FieldHook = async ({ value, data, originalDoc, req, context }) => {
  const base = slugify(String(value || data?.name || originalDoc?.name || ''))
  if (context?.slugsResolved) return value || base
  const tenant = idOf(data?.tenant ?? originalDoc?.tenant)
  const selfId = originalDoc?.id
  const taken = async (slug: string) => {
    const { totalDocs } = await req.payload.count({
      collection: 'products',
      overrideAccess: true,
      where: {
        and: [
          { slug: { equals: slug } },
          ...(tenant != null ? [{ tenant: { equals: tenant } }] : []),
          ...(selfId != null ? [{ id: { not_equals: selfId } }] : []),
        ],
      },
    })
    return totalDocs > 0
  }
  if (!(await taken(base))) return base
  const code = slugify(String(data?.code ?? originalDoc?.code ?? ''))
  if (code && code !== 'product' && code !== base && !(await taken(`${base}-${code}`))) return `${base}-${code}`
  for (let n = 2; n < 1000; n++) if (!(await taken(`${base}-${n}`))) return `${base}-${n}`
  return `${base}-${Date.now()}`
}

/** Show product edits on the public site straight away (the importer refreshes once per batch). */
const refreshAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc, context }) => {
  if (!context?.skipRevalidate) {
    refreshCatalogue(idOf(doc.tenant))
    if (previousDoc?.tenant && idOf(previousDoc.tenant) !== idOf(doc.tenant)) refreshCatalogue(idOf(previousDoc.tenant))
  }
  return doc
}
const refreshAfterDelete: CollectionAfterDeleteHook = ({ doc }) => refreshCatalogue(idOf(doc.tenant))

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['code', 'name', 'company', 'packSize', 'mrp', 'price', 'visible', 'isFeatured'],
    listSearchableFields: ['name', 'code', 'composition', 'company'],
    pagination: { defaultLimit: 50 },
  },
  // Draft / publish: edits stay private until the client presses Publish.
  versions: { drafts: true, maxPerDoc: 10 },
  access: {
    // IMPORTANT: no public read here. The REST/GraphQL API would otherwise expose `mrp`
    // for tenants who chose to hide prices. The public website reads through the Local API
    // and passes every product through src/lib/products.ts, which applies the price rules.
    read: loggedIn,
    update: loggedIn,
    // Portal staff and Tenant Super Owners add and delete; Tenant Editors only edit.
    create: portalOrAnyTenantOwner,
    delete: deleteInOwnedTenants,
  },
  hooks: { beforeChange: [onlyOwnersAdd], afterChange: [refreshAfterChange], afterDelete: [refreshAfterDelete] },
  endpoints: [importProductsEndpoint],
  // Field order and names follow the product spreadsheet:
  // id, Name, Salt, Company, Packing, Form, In Box, Shipper, MRP, Price, Category, visibility, Division, newArrivals
  fields: [
    {
      name: 'code',
      label: 'ID',
      type: 'text',
      index: true,
      admin: { description: 'Your product code. Spreadsheet imports use it to update the right product.' },
    },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'composition', label: 'Salt', type: 'textarea', admin: { rows: 2, description: 'Products with the same salt show as similar.' } },
    { name: 'company', label: 'Company', type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'packSize', label: 'Packing', type: 'text', admin: { width: '50%', description: "e.g. 10's, 30ML" } },
        { name: 'form', label: 'Form', type: 'text', admin: { width: '50%', description: 'e.g. Tablet, Capsule, Syrup, Injection' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'inBox', label: 'In Box', type: 'text', admin: { width: '50%', description: 'Units in one box, e.g. 10 or 10x10' } },
        { name: 'shipper', label: 'Shipper', type: 'text', admin: { width: '50%', description: 'Units in one shipper / case, e.g. 300' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'mrp', label: 'MRP (₹)', type: 'number', min: 0, admin: { width: '50%', description: '0 or empty: no MRP is shown.' } },
        {
          name: 'price',
          label: 'Price (₹)',
          type: 'number',
          min: 0,
          admin: { width: '50%', description: 'Your selling price. When lower than the MRP, the MRP is shown crossed out.' },
        },
      ],
    },
    { name: 'category', label: 'Category', type: 'relationship', relationTo: 'categories' },
    {
      type: 'row',
      fields: [
        {
          name: 'visible',
          label: 'Visibility (show on website)',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            components: {
              Cell: { path: '/components/admin/fields/SwitchCell#default', clientProps: { onLabel: 'Visible', offLabel: 'Hidden', color: '#16a34a' } },
            },
          },
        },
        {
          name: 'isFeatured',
          label: 'New Arrival (show on home page)',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            components: {
              Cell: { path: '/components/admin/fields/SwitchCell#default', clientProps: { onLabel: 'New', offLabel: 'Regular', color: '#2563eb' } },
            },
          },
        },
      ],
    },
    {
      name: 'division',
      label: 'Division',
      type: 'text',
      admin: { description: "The company's division, e.g. Alkem Healthcare. Visitors can filter by it after choosing the company." },
    },
    {
      type: 'collapsible',
      label: 'Image, description and price display',
      admin: { initCollapsed: true },
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'description', type: 'textarea' },
        {
          name: 'priceOverride',
          label: 'Price display',
          type: 'select',
          defaultValue: 'inherit',
          options: [
            { label: 'Follow site setting', value: 'inherit' },
            { label: 'Always show price', value: 'show' },
            { label: 'Always hide price', value: 'hide' },
          ],
        },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      admin: { position: 'sidebar', description: 'Web address of the product page. Made from the name if left empty.' },
      hooks: { beforeValidate: [uniqueSlug] },
    },
    // Older fixed list, kept so existing data is not lost. The free-text Form field replaces it.
    {
      name: 'dosageForm',
      type: 'select',
      options: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'powder', 'other'],
      admin: { hidden: true },
    },
  ],
}
