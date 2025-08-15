import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { api } from '@/api/client'
import { applyApiErrors, type ApiErrorBody } from '@/api/errors'
import type { User } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/fields'
import { toast } from '@/components/ui/toast'
import { queryClient } from '@/lib/queryClient'
import { useFieldError } from '@/lib/useFieldError'
import { queryKeys } from '@/realtime/events'

const schema = z.object({
  first_name: z.string().trim().min(1, 'validation.required').max(80),
  last_name: z.string().trim().min(1, 'validation.required').max(80),
  email: z.union([z.literal(''), z.email('validation.email')]),
  language: z.enum(['es', 'en']),
  document_type: z.enum(['', 'national_id', 'foreign_id', 'passport']),
  document_number: z.string().trim().max(30),
})
type Values = z.infer<typeof schema>
const fields = Object.keys(schema.shape) as (keyof Values)[]

const toValues = (user: User): Values => ({
  first_name: user.first_name ?? '',
  last_name: user.last_name ?? '',
  email: user.email ?? '',
  language: user.language === 'en' ? 'en' : 'es',
  document_type: user.document_type ?? '',
  document_number: user.document_number ?? '',
})

export function ProfileForm({ user }: { user: User }) {
  const { t, i18n } = useTranslation()
  const fieldError = useFieldError()
  // `values` mantiene el formulario igual a los datos del servidor sin copiarlos en un efecto.
  const form = useForm({ resolver: zodResolver(schema), values: toValues(user) })
  const [general, setGeneral] = useState<string | null>(null)
  const { errors } = form.formState

  const save = useMutation({
    mutationFn: async (values: Values) => {
      const { data, error } = await api.PATCH('/api/me/', { body: values })
      if (error) throw error as ApiErrorBody
      return data
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.me, saved)
      // El aviso se traduce después de cambiar el idioma, para que salga en el nuevo.
      void i18n
        .changeLanguage(saved.language ?? 'es')
        .then(() => toast.success(i18n.t('account.saved')))
    },
    onError: (body: ApiErrorBody) =>
      setGeneral(applyApiErrors(body, form.setError, fields) ?? t('errors.generic')),
  })

  return (
    <form
      noValidate
      className="mt-5 grid gap-5 sm:grid-cols-2"
      onSubmit={form.handleSubmit((values) => {
        setGeneral(null)
        save.mutate(values)
      })}
    >
      <TextField
        label={t('account.firstName')}
        autoComplete="given-name"
        error={fieldError(errors.first_name?.message)}
        {...form.register('first_name')}
      />
      <TextField
        label={t('account.lastName')}
        autoComplete="family-name"
        error={fieldError(errors.last_name?.message)}
        {...form.register('last_name')}
      />
      <TextField
        label={t('account.email')}
        type="email"
        autoComplete="email"
        hint={t('ui.optional')}
        error={fieldError(errors.email?.message)}
        {...form.register('email')}
      />
      <SelectField label={t('language.label')} {...form.register('language')}>
        <option value="es">{t('language.es')}</option>
        <option value="en">{t('language.en')}</option>
      </SelectField>
      <SelectField
        label={t('account.documentType')}
        error={fieldError(errors.document_type?.message)}
        {...form.register('document_type')}
      >
        <option value="">—</option>
        <option value="national_id">{t('account.documentTypes.national_id')}</option>
        <option value="foreign_id">{t('account.documentTypes.foreign_id')}</option>
        <option value="passport">{t('account.documentTypes.passport')}</option>
      </SelectField>
      <TextField
        label={t('account.documentNumber')}
        error={fieldError(errors.document_number?.message)}
        {...form.register('document_number')}
      />
      {general && (
        <p className="text-sm text-tomato sm:col-span-2" role="alert">
          {general}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
          {t('ui.save')}
        </Button>
      </div>
    </form>
  )
}
