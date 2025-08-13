import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/')({ component: Home })

// Portada provisional: la landing completa llega en su propia rama.
function Home() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <p className="font-mono text-sm uppercase tracking-widest text-blue">{t('brand.tagline')}</p>
      <h1 className="mt-4 max-w-3xl text-5xl font-extrabold sm:text-7xl">{t('home.title')}</h1>
      <p className="mt-6 max-w-xl text-lg text-ink-soft">{t('home.lead')}</p>
      <Button variant="pop" className="mt-10 text-lg">
        {t('home.cta')}
      </Button>
    </section>
  )
}
