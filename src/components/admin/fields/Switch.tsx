'use client'

/** On/off switch in the style of the reference admin (shadcn Switch): 44 x 24, round thumb. */
export function Switch({
  checked,
  onChange,
  disabled,
  color = 'var(--theme-success-500, #22c55e)',
  label,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  color?: string
  label?: string
  id?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onChange(!checked)
      }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 44,
        height: 24,
        flexShrink: 0,
        borderRadius: 999,
        border: '2px solid transparent',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: checked ? color : 'var(--theme-elevation-200)',
        transition: 'background 0.15s',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'block',
          width: 20,
          height: 20,
          borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.25)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.15s',
        }}
      />
    </button>
  )
}
