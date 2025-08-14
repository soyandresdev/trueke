import { MapPin, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ListingStatus } from '@/api/types'
import { cn } from '@/lib/cn'
import { formatMoney, ticketCode } from '@/lib/format'

import { StatusBadge } from './ui/StatusBadge'

type Props = {
  id: number
  title: string
  image?: string | null
  status: ListingStatus
  city: string
  offer?: string | null
  currency?: string
  unreadMessages?: number
  className?: string
}

/** Tarjeta de publicación para "Mis publicaciones" y el panel del operador. */
export function ListingCard({
  id,
  title,
  image,
  status,
  city,
  offer,
  currency,
  unreadMessages = 0,
  className,
}: Props) {
  const { t } = useTranslation()
  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-line bg-white transition hover:border-ink',
        className,
      )}
    >
      <div className="relative aspect-4/3 bg-paper">
        {image && <img src={image} alt="" className="size-full object-cover" loading="lazy" />}
        <StatusBadge status={status} className="absolute top-3 left-3" />
        {unreadMessages > 0 && (
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-pill bg-white px-2 py-1 text-xs font-semibold"
            aria-label={t('listing.unread', { count: unreadMessages })}
          >
            <MessageCircle className="size-3.5" aria-hidden />
            {unreadMessages}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-mono text-xs text-muted">{ticketCode(id)}</p>
        <h3 className="line-clamp-2 text-lg leading-tight font-bold">{title}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="inline-flex items-center gap-1 text-sm text-ink-soft">
            <MapPin className="size-4" aria-hidden />
            {city}
          </span>
          {offer && (
            <span className="font-display text-lg font-extrabold text-blue tabular-nums">
              {formatMoney(offer, currency)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
