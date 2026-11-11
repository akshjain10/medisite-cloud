import type { CollectionConfig } from 'payload'

import { deleteInOwnedTenants, loggedIn, nobody } from '../access'

/**
 * Orders placed from a client site's cart. Created only by the website's checkout (server
 * action, Local API), never directly over the REST API. Each tenant sees only its own orders.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customerName', 'phone', 'itemCount', 'status', 'createdAt'],
    listSearchableFields: ['orderNumber', 'customerName', 'phone'],
    description: 'Orders customers sent from the cart on your website.',
  },
  defaultSort: '-createdAt',
  access: {
    create: nobody,
    read: loggedIn,
    update: loggedIn,
    delete: deleteInOwnedTenants,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'orderNumber', label: 'Order no.', type: 'text', index: true, admin: { readOnly: true, width: '50%' } },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'new',
          admin: { width: '50%' },
          options: [
            { label: 'New', value: 'new' },
            { label: 'Confirmed', value: 'confirmed' },
            { label: 'Dispatched', value: 'dispatched' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Cancelled', value: 'cancelled' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'customerName', label: 'Customer', type: 'text', required: true, admin: { width: '50%' } },
        { name: 'phone', type: 'text', required: true, admin: { width: '50%' } },
      ],
    },
    { name: 'email', type: 'email' },
    { name: 'address', label: 'Delivery address', type: 'textarea' },
    { name: 'note', label: 'Customer note', type: 'textarea' },
    {
      name: 'items',
      type: 'array',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
            { name: 'quantity', type: 'number', required: true, min: 1, admin: { width: '15%' } },
            { name: 'unitPrice', label: 'Price (₹)', type: 'number', admin: { width: '20%', description: 'Selling price, else MRP, when the order was placed.' } },
            { name: 'code', label: 'ID', type: 'text', admin: { width: '25%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'company', type: 'text', admin: { width: '40%' } },
            { name: 'packing', type: 'text', admin: { width: '20%' } },
            { name: 'product', type: 'relationship', relationTo: 'products', admin: { width: '40%' } },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'itemCount', label: 'Items', type: 'number', admin: { readOnly: true, width: '50%' } },
        { name: 'total', label: 'Total (₹)', type: 'number', admin: { readOnly: true, width: '50%', description: 'Only for items that have a price.' } },
      ],
    },
  ],
}
