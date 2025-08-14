import { cn } from '@/lib/cn'

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl' } as const
// El color sale del nombre: la misma persona siempre tiene el mismo.
const colors = [
  'bg-pink text-ink',
  'bg-lime text-ink',
  'bg-blue text-white',
  'bg-status-pickup text-ink',
]

type Props = { name: string; src?: string | null; size?: keyof typeof sizes; className?: string }

export function Avatar({ name, src, size = 'md', className }: Props) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold',
    sizes[size],
    className,
  )
  if (src) return <img src={src} alt={name} className={cn(classes, 'object-cover')} />
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
  const color = colors[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length]
  return (
    <span role="img" aria-label={name} className={cn(classes, color)}>
      {initials || '?'}
    </span>
  )
}
