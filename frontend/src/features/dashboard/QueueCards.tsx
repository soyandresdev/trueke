import { Link } from '@tanstack/react-router'
import { Banknote, Clock, MessageSquareReply, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Dashboard, Queue } from '@/api/types'

const cards: { queue: Queue; icon: typeof Clock; accent: string }[] = [
  { queue: 'unoffered', icon: Clock, accent: 'text-blue' },
  { queue: 'countered', icon: MessageSquareReply, accent: 'text-pink' },
  { queue: 'pickups_today', icon: Truck, accent: 'text-ink' },
  { queue: 'unpaid', icon: Banknote, accent: 'text-tomato' },
]

/** Lo que espera una acción del operador. Cada tarjeta lleva al listado ya filtrado. */
export function QueueCards({ queue }: { queue: Dashboard['queue'] }) {
  const { t } = useTranslation()
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ queue: name, icon: Icon, accent }) => {
        const count = queue[name]
        // La espera solo se menciona si es de al menos un día; si no, basta con el propio estado.
        const waiting = name === 'unoffered' ? (queue.oldest_waiting_days ?? 0) : 0
        return (
          <li key={name}>
            <Link
              to="/publicaciones"
              search={{ cola: name }}
              className="flex h-full flex-col gap-2 rounded-lg border border-line bg-white p-5 hover:border-blue hover:shadow-sm"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <Icon className={`size-4 ${accent}`} aria-hidden />
                {t(`panel.queue.${name}`)}
              </span>
              <span className={`font-display text-4xl ${count ? '' : 'text-muted'}`}>{count}</span>
              <span className="text-sm text-muted">
                {count === 0
                  ? t('panel.queue.empty')
                  : waiting > 0
                    ? t('panel.queue.waiting', { count: waiting })
                    : t(`panel.queue.${name}Hint`)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
