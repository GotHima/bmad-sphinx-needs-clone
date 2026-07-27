interface NeedTypeBadgeProps {
  name: string
  color: string
  className?: string
}

export function NeedTypeBadge({ name, color, className }: NeedTypeBadgeProps) {
  return (
    <span
      style={{ backgroundColor: color }}
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-semibold uppercase tracking-[0.04em] text-white${className ? ` ${className}` : ''}`}
    >
      {name}
    </span>
  )
}
