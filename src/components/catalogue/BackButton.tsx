'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

/** "Back" like the reference; falls back to the products page when there is no history. */
export default function BackButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push('/products'))}
      className="flex items-center text-primary hover:text-primary-dark"
    >
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
      Back
    </button>
  )
}
