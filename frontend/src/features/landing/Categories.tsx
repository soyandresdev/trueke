import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useCategories } from '@/features/listings/api'
import { categoryImages } from '@/features/listings/categoryImages'

export function Categories() {
  const { t } = useTranslation()
  const { data: categories } = useCategories()
  if (!categories?.length) return null
  return (
    <section className="bg-paper py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-4xl font-extrabold sm:text-5xl">{t('landingCategories.title')}</h2>
        <p className="mt-3 max-w-xl text-ink-soft">{t('landingCategories.lead')}</p>
        <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to="/publicaciones/nueva"
                className="group relative flex aspect-4/5 items-end overflow-hidden rounded-lg bg-white"
              >
                {categoryImages[category.code] && (
                  <img
                    src={categoryImages[category.code]}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
                <span className="relative m-3 rounded-pill bg-white px-4 py-2 font-display font-bold">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
