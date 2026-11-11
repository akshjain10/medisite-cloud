'use client'

import { FieldDescription, useField } from '@payloadcms/ui'
import type { CheckboxFieldClientProps } from 'payload'

import { Switch } from './Switch'

/** Replaces Payload's checkbox with an on/off switch, for every yes/no setting. */
export default function SwitchField({ field, path, readOnly }: CheckboxFieldClientProps) {
  const { value, setValue } = useField<boolean>({ path: path ?? field.name })
  const id = `field-${(path ?? field.name).replace(/\./g, '__')}`
  const label = typeof field.label === 'string' ? field.label : field.name
  const description = typeof field.admin?.description === 'string' ? field.admin.description : undefined

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base, 20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Switch
          id={id}
          checked={Boolean(value)}
          disabled={readOnly || field.admin?.readOnly}
          onChange={(v) => setValue(v)}
          label={label}
        />
        <label htmlFor={id} style={{ cursor: 'pointer', fontWeight: 500 }}>
          {label}
        </label>
      </div>
      {description && <FieldDescription description={description} path={path ?? field.name} />}
    </div>
  )
}
