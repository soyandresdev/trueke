import { createFileRoute, redirect } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OfferOrdering, Queue } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { downloadOffers, useDashboard, useOffers } from '@/features/dashboard/api'
import { Funnel } from '@/features/dashboard/Funnel'
import { OfferTable } from '@/features/dashboard/OfferTable'
import { PeriodStats } from '@/features/dashboard/PeriodStats'
import { QueueCards } from '@/features/dashboard/QueueCards'
import { ListingFilters } from '@/features/listings/ListingFilters'
import { ensureMe } from '@/auth/session'

const orderings: OfferOrdering[] = [
  'title',
  'city',
  'status',
  'offer_amount',
  'paid_amount',
  'created_at',
  'offered_at',
]
const queues: Queue[] = ['unoffered', 'countered', 'pickups_today', 'unpaid']

type Search = {
  orden?: OfferOrdering
  cola?: Queue
  mias?: true
  q?: string
  ciudad?: string
  categoria?: string
  pagina?: number
}

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const isOrdering = (value: unknown): value is OfferOrdering =>
  orderings.includes(String(value).replace('-', '') as OfferOrdering)

export const Route = createFileRoute('/_app/panel')({
  // El panel es del operador: al vendedor no le sirve de nada y la API se lo negaría.
  beforeLoad: async () => {
    const me = await ensureMe()
    if (me?.role !== 'operator') throw redirect({ to: '/publicaciones' })
  },
  validateSearch: (search: Record<string, unknown>): Search => {
    const page = Number(search.pagina)
    return {
      orden: isOrdering(search.orden) ? (search.orden as OfferOrdering) : undefined,
      cola: queues.includes(search.cola as Queue) ? (search.cola as Queue) : undefined,
      mias: search.mias === true || search.mias === 'true' ? true : undefined,
      q: text(search.q),
      ciudad: text(search.ciudad),
      categoria: text(search.categoria),
      pagina: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  component: Panel,
})

const PAGE_SIZE = 20 // el de la API (REST_FRAMEWORK.PAGE_SIZE)
const DEFAULT_ORDERING = '-created_at' as OfferOrdering

function Panel() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [downloading, setDownloading] = useState(false)
  const tableId = useId()
  const dashboard = useDashboard()

  const filters = {
    queue: search.cola,
    assigned: search.mias ? ('me' as const) : undefined,
    q: search.q,
    city: search.ciudad,
    category: search.categoria,
    ordering: search.orden ?? DEFAULT_ORDERING,
    page: search.pagina,
  }
  const offers = useOffers(filters)

  // Cualquier cambio de filtro u orden vuelve a la primera página.
  const setSearch = (values: Partial<Search>) =>
    void navigate({ search: { ...search, ...values, pagina: undefined } })

  const download = async () => {
    setDownloading(true)
    try {
      await downloadOffers(filters, t('panel.table.fileName'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl">{t('panel.title')}</h1>

      {dashboard.data ? (
        <>
          <QueueCards queue={dashboard.data.queue} />
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Funnel funnel={dashboard.data.funnel} days={dashboard.data.days} />
            <PeriodStats period={dashboard.data.period} days={dashboard.data.days} />
          </div>
        </>
      ) : (
        <Spinner className="mt-10" />
      )}

      <section aria-labelledby={tableId} className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id={tableId} className="font-display text-2xl">
            {t('panel.table.title')}
          </h2>
          <Button variant="secondary" onClick={download} loading={downloading}>
            <Download className="size-4" aria-hidden />
            {t('panel.table.export')}
          </Button>
        </div>

        <ListingFilters
          values={{ q: search.q, ciudad: search.ciudad, categoria: search.categoria }}
          onChange={setSearch}
        />
        <label className="mt-4 flex w-fit items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={Boolean(search.mias)}
            onChange={(event) => setSearch({ mias: event.target.checked || undefined })}
            className="size-4 accent-blue"
          />
          {t('team.mine')}
        </label>
        {search.cola && (
          <p className="mt-4 flex items-center gap-3 text-sm text-ink-soft">
            {t(`panel.queue.${search.cola}`)}
            <button
              type="button"
              onClick={() => setSearch({ cola: undefined })}
              className="font-semibold text-blue underline"
            >
              {t('panel.queue.showAll')}
            </button>
          </p>
        )}

        {offers.data ? (
          offers.data.results.length === 0 ? (
            <p className="mt-8 text-ink-soft">{t('listings.emptyFiltered')}</p>
          ) : (
            <>
              <OfferTable
                rows={offers.data.results}
                ordering={filters.ordering}
                onOrder={(orden) => setSearch({ orden })}
              />
              <Pagination
                page={search.pagina ?? 1}
                pages={Math.ceil(offers.data.count / PAGE_SIZE)}
                onChange={(pagina) => void navigate({ search: { ...search, pagina } })}
              />
            </>
          )
        ) : (
          <Spinner className="mt-10" />
        )}
      </section>
    </div>
  )
}
