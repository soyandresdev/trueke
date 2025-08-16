import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Checkbox } from '@/components/ui/fields'
import { useFieldError } from '@/lib/useFieldError'

import { PickupFields } from '../form/ListingFields'
import { pickupShape, type PickupFormValues } from '../form/schemas'
import { StepNav } from '../form/StepNav'

const schema = z.object({ ...pickupShape, terms: z.literal(true, 'validation.terms') })
export type Pickup = PickupFormValues

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
      <PickupFields register={form.register as never} errors={errors} />
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
