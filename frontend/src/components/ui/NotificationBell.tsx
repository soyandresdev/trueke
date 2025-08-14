import { Bell } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

type Props = ComponentProps<'button'> & { count: number }

/** Botón de la campana. Solo presentación: el contador lo pasa quien la usa. */
export function NotificationBell({ count, className, ...props }: Props) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className={cn('relative rounded-pill p-2.5 text-ink hover:bg-paper', className)}
      aria-label={t('notifications.bell', { count })}
      {...props}
    >
      <Bell className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex min-w-4.5 items-center justify-center rounded-pill bg-pink px-1 font-mono text-[0.65rem] leading-4.5 font-medium text-ink ring-2 ring-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}
