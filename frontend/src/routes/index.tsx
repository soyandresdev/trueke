import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/')({ component: Home })

// Portada provisional: la landing completa llega en su propia rama.
function Home() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <p className="font-mono text-sm uppercase tracking-widest text-blue">{t('brand.tagline')}</p>
      <h1 className="mt-4 max-w-3xl text-5xl font-extrabold sm:text-7xl">{t('home.title')}</h1>
      <p className="mt-6 max-w-xl text-lg text-ink-soft">{t('home.lead')}</p>
      <Link
        to="/publicaciones/nueva"
        className="mt-10 inline-flex h-14 items-center rounded-pill border-2 border-ink bg-lime px-7 text-lg font-semibold shadow-pop transition hover:-translate-x-px hover:-translate-y-px"
      >
        {t('home.cta')}
      </Link>
    </section>
  )
}
