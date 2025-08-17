import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Logo } from './Logo'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo className="h-7" />
          <p className="mt-2 text-sm text-ink-soft">{t('footer.tagline')}</p>
        </div>
        <nav
          aria-label={t('footer.nav')}
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold"
        >
          <Link to="/" hash="como-funciona" className="hover:text-blue">
            {t('home.how')}
          </Link>
          <Link to="/" hash="preguntas" className="hover:text-blue">
            {t('faq.title')}
          </Link>
          <Link to="/terminos" className="hover:text-blue">
            {t('terms.title')}
          </Link>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 font-mono text-xs text-muted">
        {t('footer.license')}
      </p>
    </footer>
  )
}
