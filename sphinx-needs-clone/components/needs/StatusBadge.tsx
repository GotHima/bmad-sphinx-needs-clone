interface StatusBadgeProps {
  value: string
  className?: string
}

export function StatusBadge({ value, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground${className ? ` ${className}` : ''}`}
    >
      {value}
    </span>
  )
}
