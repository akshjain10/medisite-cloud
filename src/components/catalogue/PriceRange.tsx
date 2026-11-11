'use client'

import * as Slider from '@radix-ui/react-slider'
import { useEffect, useState } from 'react'

import { inputClass } from '@/components/ui'

/**
 * Price filter: drag the two handles or type the lowest and highest price. Typed values are
 * applied when you press Enter or leave the box, and kept within the catalogue's price range.
 */
export default function PriceRange({
  min,
  max,
  value,
  onChange,
}: {
  min: number
  max: number
  value: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const [local, setLocal] = useState<[number, number]>(value)
  const [typed, setTyped] = useState<[string, string]>([String(value[0]), String(value[1])])
  useEffect(() => {
    setLocal(value)
    setTyped([String(value[0]), String(value[1])])
  }, [value])
  const step = Math.max(1, Math.floor((max - min) / 100))
  const thumb =
    'block h-5 w-5 rounded-full border-2 border-primary bg-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  const commitTyped = () => {
    const parse = (s: string, fallback: number) => {
      const n = Number(s.replace(/[₹,\s]/g, ''))
      return Number.isFinite(n) && s.trim() !== '' ? Math.min(max, Math.max(min, Math.round(n))) : fallback
    }
    let lo = parse(typed[0], min)
    let hi = parse(typed[1], max)
    if (lo > hi) [lo, hi] = [hi, lo]
    setLocal([lo, hi])
    setTyped([String(lo), String(hi)])
    if (lo !== value[0] || hi !== value[1]) onChange([lo, hi])
  }

  const box = `${inputClass} no-spinner h-9 w-full pl-6`

  return (
    <div className="px-2">
      <h3 className="mb-3 font-medium">Price Range</h3>
      <div className="space-y-4">
        <Slider.Root
          min={min}
          max={max}
          step={step}
          minStepsBetweenThumbs={1}
          value={local}
          onValueChange={(v) => {
            setLocal([v[0], v[1]])
            setTyped([String(v[0]), String(v[1])])
          }}
          onValueCommit={(v) => onChange([v[0], v[1]])}
          className="relative flex w-full touch-none select-none items-center"
        >
          <Slider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-100">
            <Slider.Range className="absolute h-full bg-primary" />
          </Slider.Track>
          <Slider.Thumb className={thumb} aria-label="Minimum price" />
          <Slider.Thumb className={thumb} aria-label="Maximum price" />
        </Slider.Root>
        <div className="flex items-center gap-2">
          {(['Min', 'Max'] as const).map((label, i) => (
            <label key={label} className="relative flex-1">
              <span className="sr-only">{label} price</span>
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500" aria-hidden>
                ₹
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={typed[i]}
                placeholder={label}
                onChange={(e) => setTyped((t) => (i === 0 ? [e.target.value, t[1]] : [t[0], e.target.value]))}
                onBlur={commitTyped}
                onKeyDown={(e) => e.key === 'Enter' && commitTyped()}
                className={box}
              />
            </label>
          ))}
        </div>
        <p className="px-1 text-xs text-gray-500">
          Range ₹{min.toLocaleString('en-IN')} – ₹{max.toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  )
}
