import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import type { Dashboard } from '@/api/types'
import { formatMoney } from '@/lib/format'

/** Los números del periodo, en el orden en que se miran: cuánto entró, cuánto salió, qué tan rápido. */
export function PeriodStats({ period, days }: { period: Dashboard['period']; days: number }) {
  const { t } = useTranslation()
  const titleId = useId()
  const percent = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`)
  const hours = (value: number | null) =>
    value === null ? '—' : t('panel.stats.hoursValue', { count: Math.round(value) })

  const stats = [
    { key: 'created', value: String(period.created) },
    { key: 'offered', value: String(period.offered) },
    { key: 'acceptance', value: percent(period.acceptance_rate) },
    { key: 'paidCount', value: String(period.paid_count) },
    { key: 'paidTotal', value: formatMoney(period.paid_total) },
    { key: 'averagePaid', value: period.average_paid ? formatMoney(period.average_paid) : '—' },
    { key: 'hoursToOffer', value: hours(period.hours_to_offer) },
  ] as const

  return (
    <section aria-labelledby={titleId} className="rounded-lg border border-line bg-white p-5">
      <h2 id={titleId} className="font-display text-xl">
        {t('panel.stats.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('panel.period', { count: days })}</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
        {stats.map(({ key, value }) => (
          <div key={key}>
            <dt className="text-sm text-ink-soft">{t(`panel.stats.${key}`)}</dt>
            <dd className="font-display text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
