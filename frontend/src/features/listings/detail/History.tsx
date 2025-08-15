import { useTranslation } from 'react-i18next'

import type { ListingEvent } from '@/api/types'
import { formatDate, formatMoney } from '@/lib/format'

import { useListingEvents } from '../api'

/** Historial de la publicación, del más reciente al más antiguo. */
export function History({ listingId }: { listingId: number }) {
  const { t } = useTranslation()
  const { data: events } = useListingEvents(listingId)
  if (!events?.length) return null

  return (
    <ol className="relative flex flex-col gap-5 border-l-2 border-line pl-5">
      {[...events].reverse().map((event) => (
        <li key={event.id} className="relative">
          <span
            className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-blue ring-4 ring-white"
            aria-hidden
          />
          <p className="font-semibold">
            {t(`history.${event.action}` as 'history.create', { defaultValue: event.action })}
          </p>
          <Detail event={event} />
          <p className="font-mono text-xs text-muted">
            {formatDate(event.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
            {event.actor?.name && ` · ${event.actor.name}`}
          </p>
        </li>
      ))}
    </ol>
  )
}

function Detail({ event }: { event: ListingEvent }) {
  const { t } = useTranslation()
  const data = (event.data ?? {}) as Record<string, string | null | undefined>
  const text =
    event.action === 'offer' && data.amount
      ? formatMoney(data.amount, data.currency ?? undefined)
      : event.action === 'pickup' && data.pickup_by
        ? [
            t(`pickupBy.${data.pickup_by}` as 'pickupBy.platform'),
            data.pickup_date && formatDate(data.pickup_date),
          ]
            .filter(Boolean)
            .join(' · ')
        : data.reason
  return text ? <p className="text-sm text-ink-soft">{text}</p> : null
}
