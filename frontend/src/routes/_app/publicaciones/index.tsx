import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ListingStatus } from '@/api/types'
import { useMe } from '@/auth/session'
import { ListingCard } from '@/components/ListingCard'
import { Spinner } from '@/components/ui/Spinner'
import { useListings, useListingStats } from '@/features/listings/api'
import { cn } from '@/lib/cn'

const statuses: ListingStatus[] = [
  'in_review',
  'offered',
  'accepted',
  'pickup_sent',
  'completed',
  'cancelled',
]
const isStatus = (value: unknown): value is ListingStatus =>
  statuses.includes(value as ListingStatus)

export const Route = createFileRoute('/_app/publicaciones/')({
  validateSearch: (search: Record<string, unknown>): { estado?: ListingStatus } => ({
    estado: isStatus(search.estado) ? search.estado : undefined,
  }),
  component: Listings,
})

function Listings() {
  const { t } = useTranslation()
  const { estado } = Route.useSearch()
  const { data: me } = useMe()
  const operator = me?.role === 'operator'
  const stats = useListingStats()
  const listings = useListings({ status: estado })
  const total = stats.data ? Object.values(stats.data).reduce((sum, n) => sum + n, 0) : undefined

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold">
          {operator ? t('listings.titleOperator') : t('listings.title')}
        </h1>
        {!operator && (
          <Link
            to="/publicaciones/nueva"
            className="inline-flex h-11 items-center gap-2 rounded-pill border-2 border-ink bg-lime px-5 font-semibold shadow-pop transition hover:-translate-x-px hover:-translate-y-px"
          >
            <Plus className="size-5" aria-hidden />
            {t('listings.new')}
          </Link>
        )}
      </div>

      <nav
        aria-label={t('listings.filter')}
        className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-2"
      >
        <Tab to={undefined} active={!estado} label={t('listings.all')} count={total} />
        {statuses.map((status) => (
          <Tab
            key={status}
            to={status}
            active={estado === status}
            label={t(`status.${status}`)}
            count={stats.data?.[status]}
          />
        ))}
      </nav>

      {listings.isPending ? (
        <Spinner className="mx-auto mt-20 block size-6 text-blue" />
      ) : listings.isError ? (
        <p className="mt-16 text-center text-ink-soft">{t('errors.generic')}</p>
      ) : listings.data.results.length === 0 ? (
        <EmptyState filtered={Boolean(estado)} canCreate={!operator} />
      ) : (
        <ul
          className={cn(
            'mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3',
            listings.isPlaceholderData && 'opacity-60',
          )}
        >
          {listings.data.results.map((listing) => (
            <li key={listing.id}>
              <Link
                to="/publicaciones/$id"
                params={{ id: listing.id }}
                className="block rounded-lg"
              >
                <ListingCard
                  id={listing.id}
                  title={listing.title}
                  image={listing.images[0]?.image}
                  status={listing.status}
                  city={listing.city}
                  offer={listing.offer_amount}
                  currency={listing.offer_currency || undefined}
                  unreadMessages={listing.unread_messages}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Tab({
  to,
  active,
  label,
  count,
}: {
  to?: ListingStatus
  active: boolean
  label: string
  count?: number
}) {
  return (
    <Link
      to="/publicaciones"
      search={{ estado: to }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-pill border px-4 py-2 text-sm font-semibold transition',
        active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink',
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn('font-mono text-xs', active ? 'text-lime' : 'text-muted')}>
          {count}
        </span>
      )}
    </Link>
  )
}

function EmptyState({ filtered, canCreate }: { filtered: boolean; canCreate: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="mt-10 rounded-lg border-2 border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-2xl font-bold">
        {filtered ? t('listings.emptyFiltered') : t('listings.empty')}
      </p>
      {!filtered && canCreate && (
        <Link
          to="/publicaciones/nueva"
          className="mt-4 inline-block font-semibold text-blue hover:underline"
        >
          {t('listings.emptyCta')}
        </Link>
      )}
    </div>
  )
}
