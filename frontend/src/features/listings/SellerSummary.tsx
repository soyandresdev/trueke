import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { SellerSummary as Summary } from '@/api/types'
import { formatMoney } from '@/lib/format'

/** Franja de arriba de "Mis publicaciones": lo ganado, lo que falta cobrar y lo que sigue en curso. */
export function SellerSummary({ summary }: { summary: Summary }) {
  const { t } = useTranslation()
  const money = (amount: string) => formatMoney(amount, summary.currency)

  return (
    <dl className="mt-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border-2 border-ink bg-lime p-5 shadow-pop">
        <dt className="text-sm font-semibold">{t('summary.earned')}</dt>
        <dd className="font-display text-3xl">{money(summary.paid_total)}</dd>
        {summary.paid_count > 0 && (
          <Link to="/pagos" className="mt-1 inline-block text-sm font-semibold underline">
            {t('summary.seePayments', { count: summary.paid_count })}
          </Link>
        )}
      </div>
      <Box label={t('summary.pending')} value={money(summary.pending_total)}>
        {t('summary.pendingHint')}
      </Box>
      <Box label={t('summary.inProgress')} value={String(summary.in_progress)}>
        {t('summary.inProgressHint')}
      </Box>
    </dl>
  )
}

function Box({ label, value, children }: { label: string; value: string; children: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <dt className="text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className="font-display text-3xl">{value}</dd>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  )
}
