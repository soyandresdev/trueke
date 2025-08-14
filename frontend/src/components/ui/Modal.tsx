import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Diálogo modal sobre `<dialog>` nativo: foco atrapado, Escape y fondo inerte los da el navegador.
 * Se cierra con Escape, con la X o al hacer clic fuera.
 */
export function Modal({ open, onClose, title, children, footer, className }: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // Sincroniza la prop con el estado del elemento del DOM (showModal no tiene equivalente declarativo).
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      aria-labelledby={titleId}
      className={cn(
        'm-auto w-[min(32rem,calc(100%-2rem))] rounded-lg bg-white p-0 text-ink shadow-card backdrop:bg-ink/40 backdrop:backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <h2 id={titleId} className="text-2xl font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="-m-2 rounded-pill p-2 hover:bg-paper"
          aria-label={t('ui.close')}
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>
      )}
    </dialog>
  )
}
