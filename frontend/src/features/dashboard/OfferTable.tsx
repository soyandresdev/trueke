import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { OfferOrdering, OfferRow } from '@/api/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatMoney, ticketCode } from '@/lib/format'

type Column = {
  key: OfferOrdering
  label: string
  right?: boolean
  /** Las cifras y las fechas se miran de mayor a menor; los textos, de la A a la Z. */
  desc?: boolean
}

type Props = {
  rows: OfferRow[]
  ordering: OfferOrdering
  onOrder: (ordering: OfferOrdering) => void
}

/** Tabla de ofertas: el dinero y las fechas de todas las publicaciones, ordenable por columna. */
export function OfferTable({ rows, ordering, onOrder }: Props) {
  const { t } = useTranslation()
  const columns: Column[] = [
    { key: 'title', label: t('table.listing') },
    { key: 'city', label: t('wizard.city') },
    { key: 'status', label: t('table.status') },
    { key: 'offer_amount', label: t('table.offer'), right: true, desc: true },
    { key: 'paid_amount', label: t('panel.table.paid'), right: true, desc: true },
    { key: 'created_at', label: t('panel.table.published'), right: true, desc: true },
    { key: 'offered_at', label: t('panel.table.offered'), right: true, desc: true },
  ]
  const field = ordering.replace('-', '') as OfferOrdering
  const descending = ordering.startsWith('-')

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-paper font-mono text-xs tracking-wide text-muted uppercase">
          <tr>
            {columns.map((column) => {
              const active = column.key === field
              return (
                <th
                  key={column.key}
                  className={`font-medium ${column.right ? 'text-right' : ''}`}
                  aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    // Al repetir la columna se invierte el sentido; una nueva empieza por su orden natural.
                    onClick={() => onOrder(nextOrdering(column, active, descending))}
                    className={`flex w-full items-center gap-1 px-4 py-3 hover:text-ink ${column.right ? 'justify-end' : ''} ${active ? 'text-ink' : ''}`}
                  >
                    {column.label}
                    {active &&
                      (descending ? (
                        <ChevronDown className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronUp className="size-3.5" aria-hidden />
                      ))}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className="group relative hover:bg-paper/60">
              <td className="px-4 py-3">
                <p className="font-mono text-xs text-muted">{ticketCode(row.id)}</p>
                <Link
                  to="/publicaciones/$id"
                  params={{ id: row.id }}
                  className="font-semibold after:absolute after:inset-0 group-hover:text-blue"
                >
                  {row.title}
                </Link>
                <p className="text-muted">
                  {row.seller.name || '—'} · {row.category}
                  {row.assigned_to && (
                    <span className="ml-2 rounded-pill bg-blue-soft px-2 py-0.5 text-xs font-semibold text-blue-dark">
                      {row.assigned_to.name}
                    </span>
                  )}
                </p>
              </td>
              <td className="px-4 py-3">{row.city}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <Amount amount={row.offer_amount} currency={row.offer_currency} />
                {row.counter_amount && (
                  <p className="text-xs text-pink">
                    {t('panel.table.counter')}{' '}
                    {formatMoney(row.counter_amount, row.offer_currency || undefined)}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Amount amount={row.paid_amount} currency={row.offer_currency} />
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap text-muted">
                {formatDate(row.created_at)}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap text-muted">
                {row.offered_at ? formatDate(row.offered_at) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function nextOrdering(column: Column, active: boolean, descending: boolean) {
  const reverse = active ? !descending : Boolean(column.desc)
  return (reverse ? `-${column.key}` : column.key) as OfferOrdering
}

function Amount({ amount, currency }: { amount?: string | null; currency?: string | null }) {
  if (!amount) return <span className="text-muted">—</span>
  return <span className="font-semibold">{formatMoney(amount, currency || undefined)}</span>
}
