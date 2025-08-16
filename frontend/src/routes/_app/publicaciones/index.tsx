import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ListingStatus } from '@/api/types'
import { useMe } from '@/auth/session'
import { ListingCard } from '@/components/ListingCard'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { useListings, useListingStats } from '@/features/listings/api'
import { ListingFilters } from '@/features/listings/ListingFilters'
import { ListingTable } from '@/features/listings/ListingTable'
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

type Search = {
  estado?: ListingStatus
  q?: string
  ciudad?: string
  categoria?: string
  pagina?: number
}

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

export const Route = createFileRoute('/_app/publicaciones/')({
  validateSearch: (search: Record<string, unknown>): Search => {
    const page = Number(search.pagina)
    return {
      estado: isStatus(search.estado) ? search.estado : undefined,
      q: text(search.q),
      ciudad: text(search.ciudad),
      categoria: text(search.categoria),
      pagina: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  component: Listings,
})

const PAGE_SIZE = 20 // el de la API (REST_FRAMEWORK.PAGE_SIZE)

function Listings() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: me } = useMe()
  const operator = me?.role === 'operator'
  const stats = useListingStats()
  const listings = useListings({
    status: search.estado,
    q: search.q,
    city: search.ciudad,
    category: search.categoria,
    page: search.pagina,
  })
  const total = stats.data ? Object.values(stats.data).reduce((sum, n) => sum + n, 0) : undefined
  const filtered = Boolean(search.estado || search.q || search.ciudad || search.categoria)
  // Cambiar un filtro vuelve a la primera página.
  const setSearch = (next: Partial<Search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next, pagina: undefined }) })
  const results = listings.data?.results ?? []
  const pages = Math.ceil((listings.data?.count ?? 0) / PAGE_SIZE)

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

      {operator && (
        <ListingFilters
          values={{ q: search.q, ciudad: search.ciudad, categoria: search.categoria }}
          onChange={(values) => setSearch(values)}
        />
      )}

      <nav
        aria-label={t('listings.filter')}
        className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2"
      >
        <Tab to={undefined} active={!search.estado} label={t('listings.all')} count={total} />
        {statuses.map((status) => (
          <Tab
            key={status}
            to={status}
            active={search.estado === status}
            label={t(`status.${status}`)}
            count={stats.data?.[status]}
          />
        ))}
      </nav>

      {listings.isPending ? (
        <Spinner className="mx-auto mt-20 block size-6 text-blue" />
      ) : listings.isError ? (
        <p className="mt-16 text-center text-ink-soft">{t('errors.generic')}</p>
      ) : results.length === 0 ? (
        <EmptyState filtered={filtered} canCreate={!operator} />
      ) : (
        <div className={cn(listings.isPlaceholderData && 'opacity-60 transition-opacity')}>
          {operator && (
            <div className="hidden md:block">
              <ListingTable listings={results} />
            </div>
          )}
          <ul
            className={cn('mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3', operator && 'md:hidden')}
          >
            {results.map((listing) => (
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
          <Pagination
            page={search.pagina ?? 1}
            pages={pages}
            onChange={(page) =>
              void navigate({
                search: (prev) => ({ ...prev, pagina: page > 1 ? page : undefined }),
              })
            }
          />
        </div>
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
      search={(prev) => ({ ...prev, estado: to, pagina: undefined })}
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
