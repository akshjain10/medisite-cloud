import type { ReactNode } from 'react'

/** Standard content width and padding for inner pages, as in the reference (container px-4 py-8). */
export function PageShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`container mx-auto px-4 py-8 ${className}`}>{children}</div>
}
