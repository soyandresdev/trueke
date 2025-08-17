import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { useFieldError } from '@/lib/useFieldError'

const schema = z.object({ email: z.email('validation.email') })

export function Newsletter() {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  const inputId = useId()
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } })
  const subscribe = useMutation({
    mutationFn: async (email: string) => {
      const { error, response } = await api.POST('/api/newsletter/subscribe/', { body: { email } })
      if (error !== undefined || !response.ok) throw new Error(String(response.status))
    },
  })
  const error = fieldError(form.formState.errors.email?.message)

  return (
    <section className="bg-ink py-20 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="text-4xl font-extrabold sm:text-5xl">{t('newsletter.title')}</h2>
          <p className="mt-3 text-muted">{t('newsletter.lead')}</p>
        </div>
        {subscribe.isSuccess ? (
          <p className="rounded-lg bg-lime p-5 font-semibold text-ink" role="status">
            {t('newsletter.done')}
          </p>
        ) : (
          <form
            noValidate
            onSubmit={form.handleSubmit(({ email }) => subscribe.mutate(email))}
            className="flex flex-col gap-2"
          >
            <label htmlFor={inputId} className="sr-only">
              {t('account.email')}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id={inputId}
                type="email"
                autoComplete="email"
                placeholder={t('newsletter.placeholder')}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className="h-12 flex-1 rounded-pill border-2 border-white/20 bg-white/5 px-5 text-white placeholder:text-muted focus:border-lime focus:outline-none"
                {...form.register('email')}
              />
              <Button
                type="submit"
                variant="pop"
                size="lg"
                className="h-12"
                loading={subscribe.isPending}
              >
                {t('newsletter.cta')}
              </Button>
            </div>
            {(error || subscribe.isError) && (
              <p id={`${inputId}-error`} className="text-sm text-pink" role="alert">
                {error ?? t('errors.generic')}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  )
}
