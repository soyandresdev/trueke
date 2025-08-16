import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Props = { page: number; pages: number; onChange: (page: number) => void }

export function Pagination({ page, pages, onChange }: Props) {
  const { t } = useTranslation()
  if (pages <= 1) return null
  const button =
    'inline-flex items-center gap-1 rounded-pill px-4 py-2 text-sm font-semibold hover:bg-paper disabled:pointer-events-none disabled:opacity-40'
  return (
    <nav aria-label={t('pagination.label')} className="mt-8 flex items-center justify-center gap-3">
      <button
        type="button"
        className={button}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t('pagination.previous')}
      </button>
      <span className="font-mono text-sm text-ink-soft">
        {t('pagination.status', { page, pages })}
      </span>
      <button
        type="button"
        className={button}
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {t('pagination.next')}
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  )
}
