import { cn } from '@/lib/utils'

interface IdChipProps {
  id: string
  className?: string
}

export function IdChip({ id, className }: IdChipProps) {
  return (
    <span className={cn('font-mono text-[12px] font-medium text-primary', className)}>
      {id}
    </span>
  )
}
