import type { Notification } from '@/api/types'
import i18n from '@/i18n'
import { formatMoney } from '@/lib/format'

/** Texto de una notificación en el idioma actual. El backend solo manda `kind` y datos. */
export function notificationText(
  notification: Pick<Notification, 'kind' | 'listing' | 'actor' | 'data'>,
) {
  const data = (notification.data ?? {}) as { amount?: string; currency?: string; count?: number }
  return i18n.t(`notifications.kinds.${notification.kind}`, {
    title: notification.listing?.title ?? '',
    actor: notification.actor?.name || 'Trueke',
    amount: data.amount ? formatMoney(data.amount, data.currency) : '',
    count: data.count ?? 1,
  })
}
