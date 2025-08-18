import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCategories } from './api'

export type FilterValues = { q?: string; ciudad?: string; categoria?: string }

type Props = { values: FilterValues; onChange: (values: FilterValues) => void }

const DEBOUNCE_MS = 350

/** Búsqueda y filtros del panel del operador. Los valores viven en la URL. */
export function ListingFilters({ values, onChange }: Props) {
  const { t } = useTranslation()
  const { data: categories } = useCategories()
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
      <DebouncedInput
        // Si la URL cambia desde fuera (atrás/adelante), el campo vuelve a montarse con el valor nuevo.
        key={`q-${values.q ?? ''}`}
        label={t('filters.search')}
        placeholder={t('filters.searchPlaceholder')}
        icon
        value={values.q ?? ''}
        onCommit={(q) => onChange({ ...values, q: q || undefined })}
      />
      <DebouncedInput
        key={`c-${values.ciudad ?? ''}`}
        label={t('wizard.city')}
        placeholder={t('filters.anyCity')}
        value={values.ciudad ?? ''}
        onCommit={(ciudad) => onChange({ ...values, ciudad: ciudad || undefined })}
      />
      <label className="flex flex-col gap-1">
        <span className="sr-only">{t('listing.category')}</span>
        <select
          value={values.categoria ?? ''}
          onChange={(event) => onChange({ ...values, categoria: event.target.value || undefined })}
          className="h-11 rounded-md border border-line bg-white px-3.5 focus:border-blue focus:ring-2 focus:ring-blue-soft focus:outline-none"
        >
          <option value="">{t('filters.anyCategory')}</option>
          {categories?.map((category) => (
            <option key={category.code} value={category.code}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

type InputProps = {
  label: string
  placeholder: string
  value: string
  icon?: boolean
  onCommit: (value: string) => void
}

/** Campo que aplica el valor al dejar de escribir (o con Enter), sin un efecto por cada tecla. */
function DebouncedInput({ label, placeholder, value, icon, onCommit }: InputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const commit = (next: string) => {
    clearTimeout(timer.current)
    if (next.trim() !== value) onCommit(next.trim())
  }

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      {icon && (
        <Search className="pointer-events-none absolute left-3.5 size-4 text-muted" aria-hidden />
      )}
      <input
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => commit(next), DEBOUNCE_MS)
        }}
        onKeyDown={(event) => event.key === 'Enter' && commit(text)}
        // Al salir del campo (p. ej. para abrir un resultado) la búsqueda pendiente se aplica ya. Si se
        // aplicara después, al cumplirse la espera, navegaría de vuelta a la lista desde el detalle.
        onBlur={() => commit(text)}
        className={`h-11 w-full rounded-md border border-line bg-white pr-10 focus:border-blue focus:ring-2 focus:ring-blue-soft focus:outline-none [&::-webkit-search-cancel-button]:hidden ${icon ? 'pl-10' : 'pl-3.5'}`}
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText('')
            commit('')
          }}
          className="absolute right-2 rounded-full p-1.5 text-muted hover:bg-paper hover:text-ink"
          aria-label={t('filters.clear', { field: label })}
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </label>
  )
}
