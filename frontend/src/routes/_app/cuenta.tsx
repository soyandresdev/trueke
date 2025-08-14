import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { endSession, useMe } from '@/auth/session'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { DocumentsCard } from '@/features/account/DocumentsCard'
import { ProfileForm } from '@/features/account/ProfileForm'

export const Route = createFileRoute('/_app/cuenta')({ component: Account })

function Account() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: me, isPending, isError, refetch } = useMe()

  if (isPending) return <Spinner className="mx-auto mt-24 block size-6 text-blue" />
  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-soft">{t('errors.generic')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void refetch()}>
          {t('ui.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{me.phone}</p>
          <h1 className="mt-1 text-4xl font-extrabold">{t('account.title')}</h1>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            endSession()
            void navigate({ to: '/' })
          }}
        >
          <LogOut className="size-4" aria-hidden />
          {t('account.logout')}
        </Button>
      </div>

      {!me.profile_complete && (
        <div className="mt-8 rounded-lg border-2 border-ink bg-lime-soft p-5">
          <p className="font-display text-lg font-bold">{t('account.incompleteTitle')}</p>
          <p className="mt-1 text-ink-soft">{t('account.incompleteLead')}</p>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-bold">{t('account.profile')}</h2>
        <ProfileForm user={me} />
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">{t('account.documents')}</h2>
        <p className="mt-1 text-ink-soft">{t('account.documentsLead')}</p>
        <DocumentsCard user={me} />
      </section>
    </div>
  )
}
