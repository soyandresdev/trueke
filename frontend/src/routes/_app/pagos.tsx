import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'
import { openPaymentReceipt, useListings, useSellerSummary } from '@/features/listings/api'
import { formatDate, formatMoney, ticketCode } from '@/lib/format'

export const Route = createFileRoute('/_app/pagos')({ component: Payments })

/** Historial de pagos del vendedor: cada venta pagada, con su comprobante. */
function Payments() {
  const { t } = useTranslation()
  // Una venta pagada es una publicación en estado "pagada": no hace falta otra lista.
  const listings = useListings({ status: 'paid' })
  const summary = useSellerSummary(true)
  const paid = listings.data?.results ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/publicaciones"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-blue"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('nav.listings')}
      </Link>
      <h1 className="mt-4 font-display text-4xl">{t('payments.title')}</h1>

      {summary.data && summary.data.paid_count > 0 && (
        <p className="mt-3 text-ink-soft">
          {t('payments.lead', {
            total: formatMoney(summary.data.paid_total, summary.data.currency),
            count: summary.data.paid_count,
          })}
        </p>
      )}

      {listings.isPending ? (
        <Spinner className="mx-auto mt-20 block size-6 text-blue" />
      ) : paid.length === 0 ? (
        <p className="mt-10 text-ink-soft">{t('payments.empty')}</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {paid.map((listing) => (
            <li
              key={listing.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-white p-5"
            >
              <div>
                <p className="font-mono text-xs text-muted">{ticketCode(listing.id)}</p>
                <Link
                  to="/publicaciones/$id"
                  params={{ id: listing.id }}
                  className="font-semibold hover:text-blue"
                >
                  {listing.title}
                </Link>
                <p className="text-sm text-muted">
                  {listing.paid_at && formatDate(listing.paid_at)}
                  {listing.payment_reference && ` · ${listing.payment_reference}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-display text-2xl">
                  {formatMoney(listing.paid_amount ?? 0, listing.offer_currency || undefined)}
                </span>
                {listing.has_payment_receipt && (
                  <button
                    type="button"
                    onClick={() => void openPaymentReceipt(listing.id)}
                    className="inline-flex items-center gap-2 rounded-pill border border-line px-4 py-2 text-sm font-semibold hover:bg-paper"
                  >
                    <FileText className="size-4" aria-hidden />
                    {t('payment.receipt')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
