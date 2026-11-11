'use client'

import { toast, useConfig } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import { useState } from 'react'

import { Switch } from './Switch'

type Props = DefaultCellComponentProps & { onLabel?: string; offLabel?: string; color?: string }

/**
 * Switch shown directly in the product list (like the reference admin's Visibility and
 * New Arrivals columns). Saves straight away; the database rules still decide who may change it.
 */
export default function SwitchCell({ cellData, rowData, field, collectionSlug, onLabel = 'Yes', offLabel = 'No', color }: Props) {
  const name = 'name' in field ? String(field.name) : ''
  const { config } = useConfig()
  const [value, setValue] = useState<boolean>(cellData !== false && cellData != null ? Boolean(cellData) : name === 'visible' && cellData == null)
  const [busy, setBusy] = useState(false)

  const save = async (next: boolean) => {
    setBusy(true)
    setValue(next)
    try {
      const res = await fetch(`${config.routes.api}/${collectionSlug}/${rowData.id}?depth=0`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [name]: next }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.errors?.[0]?.message ?? `Could not save (${res.status})`)
      }
      toast.success(`${rowData.name ?? 'Saved'}: ${next ? onLabel : offLabel}`)
    } catch (e) {
      setValue(!next)
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
      <Switch checked={value} disabled={busy} onChange={save} color={color} label={`${name}: ${value ? onLabel : offLabel}`} />
      <span style={{ fontSize: 13, fontWeight: 500, color: value ? color : 'var(--theme-elevation-500)' }}>{value ? onLabel : offLabel}</span>
    </div>
  )
}
