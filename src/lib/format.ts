export const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)

/** Only accept #rrggbb so a client can never inject CSS through the theme field. */
export const safeColor = (value: string | null | undefined, fallback = '#2563eb') =>
  value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
