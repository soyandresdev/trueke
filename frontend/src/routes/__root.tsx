import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/Logo'
import { languages } from '@/i18n'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const { t, i18n } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" aria-label="Trueke">
          <Logo className="h-8" />
        </Link>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <span className="sr-only">{t('language.label')}</span>
          <select
            value={i18n.resolvedLanguage}
            onChange={(event) => void i18n.changeLanguage(event.target.value)}
            className="rounded-sm border border-line bg-white px-2 py-1"
          >
            {languages.map((lng) => (
              <option key={lng} value={lng}>
                {t(`language.${lng}`)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

function NotFound() {
  const { t } = useTranslation()
  return <p className="mx-auto max-w-6xl px-4 py-16 text-ink-soft">{t('notFound')}</p>
}
