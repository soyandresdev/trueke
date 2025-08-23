import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import type { Dashboard } from '@/api/types'

const steps = ['created', 'offered', 'accepted', 'picked_up', 'completed', 'paid'] as const

/** De las publicaciones del periodo, cuántas llegaron a cada paso. */
export function Funnel({ funnel, days }: { funnel: Dashboard['funnel']; days: number }) {
  const { t } = useTranslation()
  const titleId = useId()
  const total = funnel.created

  return (
    <section aria-labelledby={titleId} className="rounded-lg border border-line bg-white p-5">
      <h2 id={titleId} className="font-display text-xl">
        {t('panel.funnel.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('panel.period', { count: days })}</p>
      {total === 0 ? (
        <p className="mt-6 text-sm text-muted">{t('panel.funnel.empty')}</p>
      ) : (
        <ol className="mt-5 flex flex-col gap-3">
          {steps.map((step) => {
            const count = funnel[step]
            const share = Math.round((count / total) * 100)
            return (
              <li
                key={step}
                className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm"
              >
                <span className="truncate text-ink-soft">{t(`panel.funnel.${step}`)}</span>
                <span className="h-7 rounded-sm bg-paper" aria-hidden>
                  <span
                    className="block h-full rounded-sm bg-blue"
                    style={{ width: `${Math.max(share, 2)}%` }}
                  />
                </span>
                <span className="text-right font-mono">
                  {count}
                  <span className="ml-1 text-muted">{share}%</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
