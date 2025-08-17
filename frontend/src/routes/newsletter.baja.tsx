import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/newsletter/baja')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === 'string' && UUID.test(search.token) ? search.token : undefined,
  }),
  component: Unsubscribe,
})

/**
 * Baja del newsletter desde el enlace del correo. Pide confirmar con un botón: los clientes de
 * correo y antivirus abren los enlaces para revisarlos y no deben dar de baja a nadie.
 */
function Unsubscribe() {
  const { t } = useTranslation()
  const { token } = Route.useSearch()
  const unsubscribe = useMutation({
    mutationFn: async () => {
      const { response } = await api.POST('/api/newsletter/unsubscribe/', {
        body: { token: token! },
      })
      if (!response.ok) throw new Error(String(response.status))
    },
  })

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-4xl font-extrabold">{t('newsletter.unsubscribeTitle')}</h1>
      {!token ? (
        <p className="mt-4 text-ink-soft">{t('newsletter.badLink')}</p>
      ) : unsubscribe.isSuccess ? (
        <p className="mt-4 text-ink-soft" role="status">
          {t('newsletter.unsubscribed')}
        </p>
      ) : (
        <>
          <p className="mt-4 text-ink-soft">{t('newsletter.unsubscribeLead')}</p>
          <Button
            className="mt-8"
            loading={unsubscribe.isPending}
            onClick={() => unsubscribe.mutate()}
          >
            {t('newsletter.unsubscribeConfirm')}
          </Button>
          {unsubscribe.isError && (
            <p className="mt-4 text-sm text-tomato" role="alert">
              {t('errors.generic')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
