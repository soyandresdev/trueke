import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Ticket } from '@/components/ui/Ticket'

import { landingImages } from './images'

export function Hero() {
  const { t } = useTranslation()
  return (
    <section className="relative isolate overflow-hidden bg-blue text-white">
      <img
        src={landingImages.hero}
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover object-[70%_center] opacity-40 md:opacity-100"
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 md:grid-cols-[1.1fr_1fr] md:py-32">
        <div>
          <p className="font-mono text-sm tracking-widest text-lime uppercase">
            {t('brand.tagline')}
          </p>
          <h1 className="mt-4 text-5xl leading-[0.95] font-extrabold sm:text-7xl">
            {t('home.title')}
          </h1>
          <p className="mt-6 max-w-lg text-lg text-blue-soft">{t('home.lead')}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/publicaciones/nueva"
              className="inline-flex h-14 items-center rounded-pill border-2 border-ink bg-lime px-7 text-lg font-semibold text-ink shadow-pop transition hover:-translate-x-px hover:-translate-y-px"
            >
              {t('home.cta')}
            </Link>
            <a
              href="#como-funciona"
              className="font-semibold underline decoration-lime decoration-2 underline-offset-4"
            >
              {t('home.how')}
            </a>
          </div>
        </div>
        {/* El ticket de ejemplo "flota" junto a los objetos de la foto. */}
        <div className="hidden items-end justify-end md:flex" aria-hidden>
          <Ticket
            listingId={1024}
            title={t('home.ticketExample')}
            amount={650000}
            className="max-w-xs -rotate-3"
          />
        </div>
      </div>
    </section>
  )
}
