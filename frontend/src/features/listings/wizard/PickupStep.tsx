import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Checkbox, TextField } from '@/components/ui/fields'
import { useFieldError } from '@/lib/useFieldError'

import { StepNav } from './DetailsStep'

const schema = z.object({
  city: z.string().trim().min(2, 'validation.required').max(80, 'validation.maxLength'),
  pickup_address: z.string().trim().min(5, 'validation.required').max(200, 'validation.maxLength'),
  is_original: z.boolean(),
  terms: z.literal(true, 'validation.terms'),
})
export type Pickup = { city: string; pickup_address: string; is_original: boolean }

type Props = {
  onBack: () => void
  onSubmit: (pickup: Pickup) => void
  submitting: boolean
  error: string | null
}

export function PickupStep({ onBack, onSubmit, submitting, error }: Props) {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      city: '',
      pickup_address: '',
      is_original: true,
      terms: false as unknown as true,
    },
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit(({ terms: _terms, ...pickup }) => onSubmit(pickup))}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('wizard.city')}
          autoComplete="address-level2"
          error={fieldError(errors.city?.message)}
          {...form.register('city')}
        />
        <TextField
          label={t('wizard.address')}
          hint={t('wizard.addressHint')}
          autoComplete="street-address"
          error={fieldError(errors.pickup_address?.message)}
          {...form.register('pickup_address')}
        />
      </div>
      <Checkbox label={t('wizard.isOriginal')} {...form.register('is_original')} />
      <Checkbox
        label={t('wizard.terms')}
        error={fieldError(errors.terms?.message)}
        {...form.register('terms')}
      />
      {error && (
        <p className="text-sm text-tomato" role="alert">
          {error}
        </p>
      )}
      <StepNav onBack={onBack} submitLabel={t('wizard.publish')} submitting={submitting} />
    </form>
  )
}
