import { Link } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Listing } from '@/api/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatMoney, ticketCode } from '@/lib/format'

import { useCategories } from './api'

/** Vista densa del panel del operador (escritorio). */
export function ListingTable({ listings }: { listings: Listing[] }) {
  const { t } = useTranslation()
  const { data: categories } = useCategories()
  const categoryName = (id: number) =>
    categories?.find((category) => category.id === id)?.name ?? '—'

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-paper font-mono text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">{t('table.listing')}</th>
            <th className="px-4 py-3 font-medium">{t('table.seller')}</th>
            <th className="px-4 py-3 font-medium">{t('listing.category')}</th>
            <th className="px-4 py-3 font-medium">{t('table.status')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('table.offer')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('table.date')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {listings.map((listing) => (
            <tr key={listing.id} className="group relative hover:bg-paper/60">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {listing.images[0] ? (
                    <img
                      src={listing.images[0].thumbnail}
                      alt=""
                      className="size-12 shrink-0 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="size-12 shrink-0 rounded-md bg-paper" />
                  )}
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted">{ticketCode(listing.id)}</p>
                    {/* El enlace cubre toda la fila (after:absolute) sin romper la semántica de la tabla. */}
                    <Link
                      to="/publicaciones/$id"
                      params={{ id: listing.id }}
                      className="font-semibold after:absolute after:inset-0 group-hover:text-blue"
                    >
                      {listing.title}
                    </Link>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <p>{listing.seller.name || '—'}</p>
                <p className="text-xs text-muted">{listing.city}</p>
              </td>
              <td className="px-4 py-3">{categoryName(listing.category)}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <StatusBadge status={listing.status} />
                  {listing.unread_messages > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue"
                      aria-label={t('listing.unread', { count: listing.unread_messages })}
                    >
                      <MessageCircle className="size-3.5" aria-hidden />
                      {listing.unread_messages}
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {listing.offer_amount
                  ? formatMoney(listing.offer_amount, listing.offer_currency || undefined)
                  : '—'}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                {formatDate(listing.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
