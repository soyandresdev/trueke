import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useMe } from '@/auth/session'
import { useAuth } from '@/auth/store'
import { Logo } from '@/components/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { Toaster } from '@/components/ui/Toaster'
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
        <div className="flex items-center gap-3">
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
          <SessionLink />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}

function SessionLink() {
  const { t } = useTranslation()
  const loggedIn = useAuth((state) => state.refresh !== null)
  const { data: me } = useMe()
  if (!loggedIn) {
    return (
      <Link
        to="/entrar"
        className="rounded-pill bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft"
      >
        {t('auth.login')}
      </Link>
    )
  }
  const name = me ? `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() : ''
  return (
    <>
      <Link
        to="/publicaciones"
        className="hidden text-sm font-semibold hover:text-blue sm:inline [&.active]:text-blue"
      >
        {me?.role === 'operator' ? t('nav.listingsOperator') : t('nav.listings')}
      </Link>
      <Link to="/cuenta" aria-label={t('account.title')} className="rounded-full">
        <Avatar name={name} src={me?.photo} size="sm" />
      </Link>
    </>
  )
}

function NotFound() {
  const { t } = useTranslation()
  return <p className="mx-auto max-w-6xl px-4 py-16 text-ink-soft">{t('notFound')}</p>
}
