import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

import { useToasts, type ToastKind } from './toast'

const icons = { success: CircleCheck, error: CircleAlert, info: Info } satisfies Record<
  ToastKind,
  unknown
>
const accents: Record<ToastKind, string> = {
  success: 'text-lime',
  error: 'text-tomato',
  info: 'text-blue-soft',
}

/** Se monta una vez en el layout raíz. */
export function Toaster() {
  const { t } = useTranslation()
  const toasts = useToasts((state) => state.toasts)
  const dismiss = useToasts((state) => state.dismiss)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {toasts.map(({ id, kind, message }) => {
        const Icon = icons[kind]
        return (
          <div
            key={id}
            role={kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md bg-ink py-3 pr-2 pl-4 text-white shadow-card motion-safe:animate-[toast-in_200ms_ease-out]"
          >
            <Icon className={cn('size-5 shrink-0', accents[kind])} aria-hidden />
            <p className="flex-1 text-sm">{message}</p>
            <button
              type="button"
              onClick={() => dismiss(id)}
              className="rounded-pill p-1.5 text-muted hover:text-white"
              aria-label={t('ui.close')}
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
