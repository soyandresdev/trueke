import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Category } from '@/api/types'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

import { useCategories } from '../api'
import { categoryImages } from '../categoryImages'

type Props = { selected?: number; onSelect: (category: Category) => void }

export function CategoryStep({ selected, onSelect }: Props) {
  const { t } = useTranslation()
  const categories = useCategories()
  if (categories.isPending) return <Spinner className="mx-auto block size-6 text-blue" />
  if (categories.isError) return <p className="text-ink-soft">{t('errors.generic')}</p>

  return (
    <div>
      <p className="text-ink-soft">{t('wizard.categoryLead')}</p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {categories.data.map((category) => {
          const active = category.id === selected
          return (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onSelect(category)}
                aria-pressed={active}
                className={cn(
                  'group relative flex w-full items-end overflow-hidden rounded-lg border-2 bg-paper text-left transition',
                  categoryImages[category.code] ? 'aspect-3/2' : 'h-28',
                  active ? 'border-blue' : 'border-transparent hover:border-ink',
                )}
              >
                {categoryImages[category.code] && (
                  <img
                    src={categoryImages[category.code]}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition group-hover:scale-105"
                  />
                )}
                <span className="relative m-3 rounded-pill bg-white px-4 py-2 font-display text-lg font-bold">
                  {category.name}
                </span>
                {active && (
                  <span className="absolute top-3 right-3 rounded-full bg-blue p-1 text-white">
                    <Check className="size-4" aria-hidden />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
