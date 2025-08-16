import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import type { Category } from '@/api/types'

import { DetailsFields } from '../form/ListingFields'
import { detailsShape, type DetailsFormValues } from '../form/schemas'
import { StepNav } from '../form/StepNav'
import { emptyAttributes } from '../schemaFields'

/** `values` va a la API; `form` permite volver a este paso con lo que había escrito. */
export type Details = { values: Record<string, unknown>; form: DetailsFormValues }

type Props = {
  category: Category
  defaultValues: Details | null
  onBack: () => void
  onNext: (details: Details) => void
}

export function DetailsStep({ category, defaultValues, onBack, onNext }: Props) {
  const { i18n } = useTranslation()
  const { fields, shape } = detailsShape(category, i18n.language)
  const schema = z.object(shape)
  const form = useForm<DetailsFormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaultValues?.form ?? {
      title: '',
      description: '',
      condition: '',
      attributes: emptyAttributes(fields),
    },
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) => onNext({ values, form: form.getValues() }))}
    >
      <DetailsFields
        register={form.register as never}
        errors={form.formState.errors}
        category={category}
        fields={fields}
      />
      <StepNav onBack={onBack} />
    </form>
  )
}
