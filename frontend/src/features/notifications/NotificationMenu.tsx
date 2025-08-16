import { useNavigate } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Notification } from '@/api/types'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'

import { useMarkAllSeen, useMarkSeen, useNotifications, useUnseenCount } from './api'
import { notificationText } from './text'

/**
 * Campana de la cabecera con su lista. Usa el atributo `popover` del navegador:
 * capa superior, cierre con Escape y al hacer clic fuera, sin código propio.
 */
export function NotificationMenu() {
  const { t } = useTranslation()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const { data: count = 0 } = useUnseenCount()
  const notifications = useNotifications(open)
  const markAll = useMarkAllSeen()
  const markSeen = useMarkSeen()
  const navigate = useNavigate()

  const go = (notification: Notification) => {
    if (!notification.seen_at) markSeen.mutate(notification.id)
    document.getElementById(panelId)?.hidePopover()
    if (notification.listing)
      void navigate({ to: '/publicaciones/$id', params: { id: notification.listing.id } })
  }

  return (
    <>
      <NotificationBell count={count} popoverTarget={panelId} aria-expanded={open} />
      <div
        id={panelId}
        popover="auto"
        onToggle={(event) => setOpen((event as unknown as ToggleEvent).newState === 'open')}
        className="popover-anchored fixed inset-auto top-16 right-4 m-0 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-line bg-white p-0 text-ink shadow-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-bold">{t('notifications.title')}</h2>
          {count > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="text-sm font-semibold text-blue hover:underline"
            >
              {t('notifications.markAll')}
            </button>
          )}
        </div>
        {notifications.isPending ? (
          <Spinner className="mx-auto my-8 block size-5 text-blue" />
        ) : !notifications.data?.length ? (
          <p className="px-4 py-8 text-center text-sm text-ink-soft">{t('notifications.empty')}</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {notifications.data.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => go(notification)}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 text-left hover:bg-paper',
                    !notification.seen_at && 'bg-blue-soft/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      notification.seen_at ? 'bg-transparent' : 'bg-pink',
                    )}
                    aria-hidden
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm">{notificationText(notification)}</span>
                    <span className="font-mono text-xs text-muted">
                      {formatDate(notification.created_at, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {!notification.seen_at && (
                        <span className="sr-only"> · {t('notifications.unseen')}</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
