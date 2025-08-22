import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft, Banknote, MapPin, Pencil, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Listing } from '@/api/types'
import { useMe } from '@/auth/session'
import { Spinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Ticket } from '@/components/ui/Ticket'
import { Chat } from '@/features/chat/Chat'
import {
  openPaymentReceipt,
  useCategories,
  useListing,
  type ApiFailure,
} from '@/features/listings/api'
import { ActionPanel } from '@/features/listings/detail/ActionPanel'
import { Gallery } from '@/features/listings/detail/Gallery'
import { History } from '@/features/listings/detail/History'
import { SellerCard } from '@/features/listings/detail/SellerCard'
import { displayAttribute, fieldsFromSchema } from '@/features/listings/schemaFields'
import { formatDate, formatMoney, ticketCode } from '@/lib/format'
import { useRealtimeChannel } from '@/realtime/context'

export const Route = createFileRoute('/_app/publicaciones/$id')({
  params: {
    parse: ({ id }) => {
      if (!/^\d+$/.test(id)) throw notFound()
      return { id: Number(id) }
    },
    stringify: ({ id }) => ({ id: String(id) }),
  },
  component: ListingPage,
})

function ListingPage() {
  const { t } = useTranslation()
  const { id } = Route.useParams()
  const listing = useListing(id)
  // Cambios de estado y mensajes llegan en vivo por el WebSocket e invalidan esta query.
  useRealtimeChannel(`listing.${id}`)

  if (listing.isPending) return <Spinner className="mx-auto mt-24 block size-6 text-blue" />
  if (listing.isError) {
    const missing = (listing.error as unknown as ApiFailure).status === 404
    return (
      <p className="mx-auto max-w-6xl px-4 py-16 text-ink-soft">
        {missing ? t('notFound') : t('errors.generic')}
      </p>
    )
  }
  return <ListingView listing={listing.data} />
}

function ListingView({ listing }: { listing: Listing }) {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const isOwner = me?.id === listing.seller.id

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/publicaciones"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {isOwner ? t('listings.title') : t('listings.titleOperator')}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <Gallery listing={listing} />

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={listing.status} />
              <span className="font-mono text-sm text-muted">{ticketCode(listing.id)}</span>
            </div>
            <h1 className="mt-3 text-4xl leading-tight font-extrabold">{listing.title}</h1>
            <p className="mt-2 inline-flex items-center gap-1 text-ink-soft">
              <MapPin className="size-4" aria-hidden />
              {listing.city}
              {!isOwner && ` · ${listing.seller.name}`}
            </p>
          </div>

          {listing.offer_amount && (
            <Ticket
              listingId={listing.id}
              title={listing.title}
              amount={listing.offer_amount}
              currency={listing.offer_currency || undefined}
              // "Te ofrecemos" le habla al vendedor; el operador ve la oferta que hizo la plataforma.
              label={
                listing.status === 'completed'
                  ? t('ticket.sold')
                  : isOwner
                    ? undefined
                    : t('ticket.platform')
              }
            />
          )}

          <StatusNote listing={listing} isOwner={isOwner} />
          <div className="flex flex-wrap gap-3">
            <ActionPanel listing={listing} />
            {isOwner && listing.status === 'in_review' && (
              <Link
                to="/publicaciones/$id/editar"
                params={{ id: listing.id }}
                className="inline-flex h-11 items-center gap-2 rounded-pill border border-line px-5 font-semibold hover:border-ink"
              >
                <Pencil className="size-4" aria-hidden />
                {t('edit.button')}
              </Link>
            )}
          </div>
          {me?.role === 'operator' && !isOwner && <SellerCard sellerId={listing.seller.id} />}

          {listing.status === 'countered' && listing.counter_amount && (
            <p className="rounded-lg border-2 border-dashed border-blue bg-blue-soft/50 p-4 font-semibold">
              {t(isOwner ? 'counter.youAsked' : 'counter.sellerAsksAmount', {
                amount: formatMoney(listing.counter_amount, listing.offer_currency || undefined),
              })}
            </p>
          )}
          {listing.status === 'paid' && <PaymentBox listing={listing} />}

          {listing.pickup_by && (
            <div className="flex gap-3 rounded-lg bg-paper p-4">
              <Truck className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">
                  {t(`pickupBy.${listing.pickup_by}` as 'pickupBy.platform')}
                </p>
                {listing.pickup_date && (
                  <p className="text-sm text-ink-soft">{formatDate(listing.pickup_date)}</p>
                )}
                {listing.pickup_notes && (
                  <p className="text-sm text-ink-soft">{listing.pickup_notes}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <Details listing={listing} />
        <div className="flex flex-col gap-10">
          <Chat listingId={listing.id} asPlatform={!isOwner} />
          <section>
            <h2 className="mb-5 text-2xl font-bold">{t('listing.history')}</h2>
            <History listingId={listing.id} />
          </section>
        </div>
      </div>
    </div>
  )
}

function PaymentBox({ listing }: { listing: Listing }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-3 rounded-lg border-2 border-ink bg-lime-soft p-4">
      <Banknote className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">
          {t('payment.paid', {
            amount: formatMoney(listing.paid_amount ?? 0, listing.offer_currency || undefined),
          })}
        </p>
        <p className="text-sm text-ink-soft">
          {listing.paid_at && formatDate(listing.paid_at)}
          {listing.payment_reference &&
            ` · ${t('payment.reference')}: ${listing.payment_reference}`}
        </p>
        {listing.has_payment_receipt && (
          <button
            type="button"
            onClick={() => void openPaymentReceipt(listing.id)}
            className="mt-1 text-sm font-semibold text-blue hover:underline"
          >
            {t('payment.receipt')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Qué está pasando y qué toca ahora, según el estado y quién mira. */
function StatusNote({ listing, isOwner }: { listing: Listing; isOwner: boolean }) {
  const { t } = useTranslation()
  const side = isOwner ? 'seller' : 'operator'
  const key = `statusNote.${side}.${listing.status}` as 'statusNote.seller.in_review'
  return (
    <div>
      <p className="text-ink-soft">{t(key)}</p>
      {listing.cancel_reason && (
        <p className="mt-1 text-sm text-ink-soft">
          {t('listing.reason')}: {listing.cancel_reason}
        </p>
      )}
    </div>
  )
}

function Details({ listing }: { listing: Listing }) {
  const { t, i18n } = useTranslation()
  const { data: categories } = useCategories()
  const category = categories?.find((item) => item.id === listing.category)
  const fields = category ? fieldsFromSchema(category.fields_schema, i18n.language) : []
  const attributes = (listing.attributes ?? {}) as Record<string, unknown>
  const rows = [
    ...(category ? [[t('listing.category'), category.name]] : []),
    [t('wizard.condition'), t(`condition.${listing.condition}`)],
    [t('listing.original'), listing.is_original ? t('ui.yes') : t('ui.no')],
    ...fields.flatMap((field) => {
      const value = displayAttribute(field, attributes[field.name], {
        yes: t('ui.yes'),
        no: t('ui.no'),
      })
      return value === null ? [] : [[field.label, value]]
    }),
  ]

  return (
    <section>
      <h2 className="text-2xl font-bold">{t('listing.details')}</h2>
      <p className="mt-4 whitespace-pre-line text-ink-soft">{listing.description}</p>
      <dl className="mt-6 divide-y divide-line border-y border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-3">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
