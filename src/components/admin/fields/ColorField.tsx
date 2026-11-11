'use client'

import { FieldDescription, FieldError, useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { useEffect, useState } from 'react'

type Swatch = { hex: string; name: string }

// Colours that work well for buttons with white text (brand) and for a floating button (accent).
const BRAND: Swatch[] = [
  { hex: '#2563eb', name: 'Blue' }, { hex: '#1d4ed8', name: 'Royal blue' }, { hex: '#4f46e5', name: 'Indigo' },
  { hex: '#7c3aed', name: 'Violet' }, { hex: '#9333ea', name: 'Purple' }, { hex: '#c026d3', name: 'Magenta' },
  { hex: '#db2777', name: 'Pink' }, { hex: '#dc2626', name: 'Red' }, { hex: '#c2410c', name: 'Burnt orange' },
  { hex: '#b45309', name: 'Amber' }, { hex: '#15803d', name: 'Green' }, { hex: '#047857', name: 'Emerald' },
  { hex: '#0f766e', name: 'Teal' }, { hex: '#0e7490', name: 'Cyan' }, { hex: '#0369a1', name: 'Sky' },
  { hex: '#334155', name: 'Slate' }, { hex: '#1f2937', name: 'Charcoal' }, { hex: '#7f1d1d', name: 'Maroon' },
]
const ACCENT: Swatch[] = [
  { hex: '#c084fc', name: 'Lavender' }, { hex: '#a855f7', name: 'Purple' }, { hex: '#f472b6', name: 'Pink' },
  { hex: '#fb7185', name: 'Rose' }, { hex: '#f97316', name: 'Orange' }, { hex: '#f59e0b', name: 'Amber' },
  { hex: '#eab308', name: 'Yellow' }, { hex: '#84cc16', name: 'Lime' }, { hex: '#22c55e', name: 'Green' },
  { hex: '#10b981', name: 'Emerald' }, { hex: '#14b8a6', name: 'Teal' }, { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#3b82f6', name: 'Blue' }, { hex: '#6366f1', name: 'Indigo' }, { hex: '#64748b', name: 'Slate' },
]

const HEX = /^#[0-9a-fA-F]{6}$/

/** WCAG contrast ratio between a colour and white (white text sits on brand buttons). */
function contrastWithWhite(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return 1.05 / (L + 0.05)
}

/**
 * Colour picker with a palette of ready-made colours, a "custom colour" option and a live
 * preview, used for the brand colour and the accent colour. Pass { palette: 'accent' } as
 * clientProps for the accent palette.
 */
export default function ColorField({ field, path, readOnly, palette = 'brand' }: TextFieldClientProps & { palette?: 'brand' | 'accent' }) {
  const fieldPath = path ?? field.name
  const { value, setValue, showError, errorMessage } = useField<string>({ path: fieldPath })
  const [text, setText] = useState(value ?? '')
  useEffect(() => setText(value ?? ''), [value])

  const swatches = palette === 'accent' ? ACCENT : BRAND
  const current = value && HEX.test(value) ? value.toLowerCase() : null
  const label = typeof field.label === 'string' ? field.label : field.name
  const description = typeof field.admin?.description === 'string' ? field.admin.description : undefined
  const lowContrast = current && palette === 'brand' && contrastWithWhite(current) < 3
  const disabled = readOnly || field.admin?.readOnly

  const pick = (hex: string) => !disabled && setValue(hex.toLowerCase())

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base, 20px)', flex: '1 1 320px', minWidth: 280 }}>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>{label}</div>

      <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 32px)', gap: 8, marginBottom: 12 }}>
        {swatches.map((s) => {
          const selected = current === s.hex
          return (
            <button
              key={s.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${s.name} ${s.hex}`}
              title={`${s.name} ${s.hex}`}
              disabled={disabled}
              onClick={() => pick(s.hex)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: s.hex,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(0,0,0,.12)',
                outline: selected ? '2px solid var(--theme-text)' : 'none',
                outlineOffset: 2,
                color: '#fff',
                fontSize: 16,
                lineHeight: '30px',
                padding: 0,
              }}
            >
              {selected ? '✓' : ''}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="color"
            aria-label={`${label}: custom colour`}
            value={current ?? '#2563eb'}
            disabled={disabled}
            onChange={(e) => pick(e.target.value)}
            style={{ width: 36, height: 32, padding: 0, border: '1px solid var(--theme-elevation-150)', borderRadius: 6, background: 'none', cursor: 'pointer' }}
          />
          Custom colour
        </label>
        <input
          type="text"
          aria-label={`${label}: hex code`}
          value={text}
          disabled={disabled}
          placeholder="#2563eb"
          maxLength={7}
          onChange={(e) => {
            setText(e.target.value)
            if (HEX.test(e.target.value)) setValue(e.target.value.toLowerCase())
          }}
          onBlur={() => !HEX.test(text) && text !== '' && setValue(text)}
          style={{ width: 96, fontFamily: 'monospace', padding: '6px 8px', border: '1px solid var(--theme-elevation-150)', borderRadius: 4, background: 'var(--theme-input-bg)', color: 'var(--theme-text)' }}
        />
        {current && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} aria-label="Preview">
            {palette === 'brand' ? (
              <>
                <span style={{ background: current, color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>Browse Products</span>
                <span style={{ color: current, fontWeight: 700 }}>MRP ₹120.00</span>
              </>
            ) : (
              <span style={{ background: current, color: '#fff', width: 40, height: 40, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.2)' }} aria-hidden>
                ☎
              </span>
            )}
          </span>
        )}
      </div>

      {lowContrast && (
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--theme-warning-700, #a16207)' }}>
          This colour is light, so white text on buttons may be hard to read. A darker shade works better.
        </p>
      )}
      {description && <FieldDescription description={description} path={fieldPath} />}
      {showError && <FieldError message={errorMessage} path={fieldPath} showError />}
    </div>
  )
}
