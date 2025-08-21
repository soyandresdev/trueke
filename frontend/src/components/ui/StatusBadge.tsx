import { useTranslation } from 'react-i18next'

import type { ListingStatus } from '@/api/types'
import { cn } from '@/lib/cn'

// Colores de brand/tokens.css. Todas las combinaciones pasan contraste AA para texto pequeño en negrita.
const styles: Record<ListingStatus, string> = {
  in_review: 'bg-status-review text-ink',
  offered: 'bg-status-offer text-white',
  accepted: 'bg-status-accepted text-ink',
  pickup_sent: 'bg-status-pickup text-ink',
  completed: 'bg-status-done text-white',
  paid: 'bg-ink text-lime',
  cancelled: 'bg-status-cancelled text-ink',
}

export function StatusBadge({ status, className }: { status: ListingStatus; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-1 font-mono text-xs font-medium tracking-wide uppercase',
        styles[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  )
}
