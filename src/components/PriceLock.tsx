'use client'

import { Loader2, Lock, LockOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createContext, useActionState, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'

import { lockPrices, unlockPrices, type UnlockState } from '@/app/(site)/priceActions'

import Modal from './cart/Modal'
import { Button, Card, cx, inputClass } from './ui'

/**
 * Price lock on the public site (client side). The server decides what is visible: locked
 * prices are simply not sent. This only shows the lock buttons and the unlock window, and
 * reloads the page data after unlocking. Server side: lib/priceLock.ts and app/(site)/priceActions.ts.
 */
type PriceLockValue = {
  /** The site locks prices (Site options → "Lock prices"). */
  enabled: boolean
  /** This visitor has unlocked them (password, or a dashboard login). */
  unlocked: boolean
  /** Unlocked with the password (not by a dashboard login), so "Lock prices" can undo it. */
  canRelock: boolean
  openUnlock: () => void
  lockAgain: () => void
}

const PriceLockContext = createContext<PriceLockValue>({ enabled: false, unlocked: false, canRelock: false, openUnlock: () => {}, lockAgain: () => {} })
export const usePriceLock = () => useContext(PriceLockContext)

function UnlockDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [mode, setMode] = useState<'password' | 'login'>('password')
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockPrices, { status: 'idle' })

  useEffect(() => {
    if (state.status === 'unlocked') {
      toast.success('Prices unlocked', { description: 'You will see prices on this browser for 30 days.' })
      router.refresh()
      onClose()
    }
  }, [state, router, onClose])

  const tab = (m: typeof mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={cx('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', mode === m ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900')}
    >
      {label}
    </button>
  )

  return (
    <Modal label="Unlock prices" onClose={onClose} className="w-full max-w-sm">
      <Card className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Lock className="h-5 w-5 text-primary" aria-hidden />
              Prices are locked
            </h2>
            <p className="mt-1 text-sm text-gray-600">Enter the password to view prices.</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="text-xl">
            ×
          </Button>
        </div>

        <form action={action} className="space-y-3">
          <input type="hidden" name="mode" value={mode} />
          {mode === 'login' && (
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="Email"
              aria-label="Email"
              className={inputClass}
            />
          )}
          <input
            key={mode}
            name="password"
            type="password"
            required
            autoFocus
            data-autofocus
            autoComplete={mode === 'login' ? 'current-password' : 'off'}
            placeholder={mode === 'login' ? 'Dashboard password' : 'Price password'}
            aria-label={mode === 'login' ? 'Dashboard password' : 'Price password'}
            className={inputClass}
          />
          {state.status === 'error' && (
            <p role="alert" className="text-sm text-red-600">
              {state.message}
            </p>
          )}
          {mode === 'login' && <p className="text-xs text-gray-500">Use the email and password you use for this website's dashboard.</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <button type="submit" disabled={pending} className={cx('inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60')}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LockOpen className="h-4 w-4" aria-hidden />}
              Unlock
            </button>
          </div>
        </form>
      </Card>
    </Modal>
  )
}

export function PriceLockProvider({ enabled, unlocked, canRelock, children }: { enabled: boolean; unlocked: boolean; canRelock: boolean; children: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const close = useCallback(() => setOpen(false), [])
  const lockAgain = useCallback(() => {
    startTransition(async () => {
      await lockPrices()
      router.refresh()
      toast('Prices locked again on this browser')
    })
  }, [router])
  const value = useMemo(() => ({ enabled, unlocked, canRelock, openUnlock: () => setOpen(true), lockAgain }), [enabled, unlocked, canRelock, lockAgain])

  return (
    <PriceLockContext.Provider value={value}>
      {children}
      {open && <UnlockDialog onClose={close} />}
    </PriceLockContext.Provider>
  )
}

/** Small "🔒 Unlock" button shown in place of a locked price. */
export function UnlockButton({ label = 'Unlock price', className = '' }: { label?: string; className?: string }) {
  const { openUnlock } = usePriceLock()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openUnlock()
      }}
      className={cx('inline-flex items-center gap-1 rounded-md border border-dashed border-primary/50 px-2 py-0.5 text-sm font-medium text-primary hover:bg-primary-soft', className)}
      title="Enter the password to view prices"
    >
      <Lock className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  )
}

/** Header control: "Unlock prices" while locked, "Lock prices" after unlocking. */
export function PriceLockToggle() {
  const { enabled, unlocked, canRelock, openUnlock, lockAgain } = usePriceLock()
  if (!enabled || (unlocked && !canRelock)) return null
  return unlocked ? (
    <Button variant="ghost" onClick={lockAgain} title="Hide prices again on this browser" className="text-gray-600">
      <LockOpen className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Lock prices</span>
    </Button>
  ) : (
    <Button variant="outline" onClick={openUnlock} title="Enter the password to view prices">
      <Lock className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Unlock prices</span>
    </Button>
  )
}
