import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { api } from '@/api/client'
import { applyApiErrors, type ApiErrorBody } from '@/api/errors'
import type { User } from '@/api/types'
import { startSession } from '@/auth/session'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/fields'
import { useCountdown } from '@/lib/useCountdown'
import { useFieldError } from '@/lib/useFieldError'

// Los mensajes son claves de i18n; el backend vuelve a validar y normaliza el número.
const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{7,20}$/, 'validation.phone'),
})
const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'validation.code'),
})

type Props = { onDone: (result: { user: User; created: boolean }) => void }

/** Paso 1: teléfono. Paso 2: código de 6 dígitos. */
export function LoginFlow({ onDone }: Props) {
  const [phone, setPhone] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState<number | null>(null)

  const sent = (value: string, resendIn: number) => {
    setPhone(value)
    setResendAt(Date.now() + resendIn * 1000)
  }

  return phone === null ? (
    <PhoneStep onSent={sent} />
  ) : (
    <CodeStep
      phone={phone}
      resendAt={resendAt}
      onResent={sent}
      onBack={() => setPhone(null)}
      onDone={onDone}
    />
  )
}

async function requestCode(phone: string) {
  const { data, error, response } = await api.POST('/api/auth/otp/request/', { body: { phone } })
  if (error) throw { status: response.status, body: error as ApiErrorBody }
  return data
}

function PhoneStep({ onSent }: { onSent: (phone: string, resendIn: number) => void }) {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  const form = useForm({ resolver: zodResolver(phoneSchema), defaultValues: { phone: '' } })
  const [general, setGeneral] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: requestCode,
    onSuccess: (data, phone) => onSent(phone, data.resend_in),
    onError: (error: { status: number; body: ApiErrorBody & { wait?: number } }, phone) => {
      // Ya hay un código vigente: se pasa al paso 2 con la espera que indica el servidor.
      if (error.status === 429 && error.body.code === 'resend_too_soon')
        return onSent(phone, error.body.wait ?? 60)
      setGeneral(applyApiErrors(error.body, form.setError, ['phone']) ?? t('errors.generic'))
    },
  })

  return (
    <form
      onSubmit={form.handleSubmit(({ phone }) => mutation.mutate(phone))}
      className="flex flex-col gap-5"
      noValidate
    >
      <div>
        <h1 className="text-4xl font-extrabold">{t('auth.title')}</h1>
        <p className="mt-2 text-ink-soft">{t('auth.phoneLead')}</p>
      </div>
      <TextField
        label={t('auth.phone')}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="300 123 4567"
        autoFocus
        error={fieldError(form.formState.errors.phone?.message)}
        {...form.register('phone')}
      />
      {general && (
        <p className="text-sm text-tomato" role="alert">
          {general}
        </p>
      )}
      <Button type="submit" size="lg" loading={mutation.isPending}>
        {t('auth.sendCode')}
      </Button>
    </form>
  )
}

type CodeStepProps = {
  phone: string
  resendAt: number | null
  onResent: (phone: string, resendIn: number) => void
  onBack: () => void
  onDone: Props['onDone']
}

function CodeStep({ phone, resendAt, onResent, onBack, onDone }: CodeStepProps) {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  const form = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })
  const [general, setGeneral] = useState<string | null>(null)
  const wait = useCountdown(resendAt)

  const verify = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await api.POST('/api/auth/otp/verify/', { body: { phone, code } })
      if (error) throw error as ApiErrorBody
      return data
    },
    onSuccess: ({ access, refresh, user, created }) => {
      startSession({ access, refresh }, user)
      onDone({ user, created })
    },
    onError: (body: ApiErrorBody) => {
      form.resetField('code', { keepError: false })
      setGeneral(applyApiErrors(body, form.setError, ['code']) ?? t('errors.generic'))
    },
  })
  const resend = useMutation({
    mutationFn: requestCode,
    onSuccess: (data) => onResent(phone, data.resend_in),
    onError: (error: { body: ApiErrorBody & { wait?: number } }) =>
      onResent(phone, error.body.wait ?? 60),
  })

  const submit = form.handleSubmit(({ code }) => {
    setGeneral(null)
    verify.mutate(code)
  })
  const codeField = form.register('code')

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('auth.changePhone')}
      </button>
      <div>
        <h1 className="text-4xl font-extrabold">{t('auth.codeTitle')}</h1>
        <p className="mt-2 text-ink-soft">{t('auth.codeLead', { phone })}</p>
      </div>
      <TextField
        label={t('auth.code')}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        className="text-center font-mono text-2xl tracking-[0.5em]"
        error={fieldError(form.formState.errors.code?.message)}
        {...codeField}
        onChange={(event) => {
          void codeField.onChange(event)
          // Con los 6 dígitos se envía solo (también cuando el móvil autocompleta el SMS).
          if (/^\d{6}$/.test(event.target.value) && !verify.isPending) void submit()
        }}
      />
      {general && (
        <p className="text-sm text-tomato" role="alert">
          {general}
        </p>
      )}
      <Button type="submit" size="lg" loading={verify.isPending}>
        {t('auth.enter')}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        {wait > 0 ? (
          t('auth.resendIn', { seconds: wait })
        ) : (
          <button
            type="button"
            className="font-semibold text-blue hover:underline"
            disabled={resend.isPending}
            onClick={() => resend.mutate(phone)}
          >
            {t('auth.resend')}
          </button>
        )}
      </p>
    </form>
  )
}
