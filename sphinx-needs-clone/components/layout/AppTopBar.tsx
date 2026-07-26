import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'

export function AppTopBar() {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background shrink-0">
      <Link href="/" className="font-semibold text-sm text-foreground">
        Sphinx Needs Clone
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" disabled>
          New Need
        </Button>
        <Link href="/settings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Settings
        </Link>
      </div>
    </header>
  )
}
