/**
 * Small building blocks with the same look as the reference project's shadcn/ui components
 * (Button, Card, Input, Badge), coloured by the client's brand tokens.
 */
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'whatsapp' | 'whatsappOutline'
type Size = 'default' | 'sm' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  default: 'bg-primary text-white hover:bg-primary-dark',
  outline: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-100',
  ghost: 'text-gray-700 hover:bg-gray-100',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
  whatsapp: 'bg-green-600 text-white hover:bg-green-700',
  whatsappOutline: 'border border-green-600 bg-white text-green-600 hover:bg-green-50',
}
const SIZES: Record<Size, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
}

export const buttonClass = (variant: Variant = 'default', size: Size = 'default', extra?: string) =>
  cx(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
    VARIANTS[variant],
    SIZES[size],
    extra,
  )

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentPropsWithoutRef<'button'> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />
}

export function Card({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cx('rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm', className)} {...props} />
}
export function CardHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cx('flex flex-col space-y-1.5 p-6', className)} {...props} />
}
export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cx('text-2xl font-semibold leading-none tracking-tight', className)}>{children}</h3>
}
export function CardContent({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cx('p-6 pt-0', className)} {...props} />
}

export const inputClass = cx(
  'flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-base md:text-sm',
  'placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
)

export function Badge({ children, variant = 'secondary' }: { children: ReactNode; variant?: 'secondary' | 'outline' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold',
        variant === 'secondary' ? 'border-transparent bg-gray-100 text-gray-900' : 'border-gray-200 text-gray-900',
      )}
    >
      {children}
    </span>
  )
}

export { cx }
