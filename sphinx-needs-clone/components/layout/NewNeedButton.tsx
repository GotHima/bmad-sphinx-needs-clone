'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function NewNeedButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('new', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Button variant="default" size="sm" onClick={handleClick}>
      New Need
    </Button>
  )
}
