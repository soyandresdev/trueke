import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import type { Category } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Checkbox, SelectField, TextArea, TextField } from '@/components/ui/fields'
import { useFieldError } from '@/lib/useFieldError'

import {
  attributesSchema,
  emptyAttributes,
  fieldsFromSchema,
  type AttributeValues,
} from '../schemaFields'

const conditions = ['new', 'like_new', 'good', 'fair', 'for_parts'] as const

function detailsSchema(category: Category, language: string) {
  const fields = fieldsFromSchema(category.fields_schema, language)
  return {
    fields,
    schema: z.object({
      title: z.string().trim().min(3, 'validation.required').max(120, 'validation.maxLength'),
      description: z
        .string()
        .trim()
        .min(10, 'validation.description')
        .max(4000, 'validation.maxLength'),
      condition: z.enum(conditions, 'validation.required'),
      attributes: attributesSchema(fields),
    }),
  }
}

type FormValues = {
  title: string
  description: string
  condition: string
  attributes: AttributeValues
}
/** `values` va a la API; `form` permite volver a este paso con lo que había escrito. */
export type Details = { values: Record<string, unknown>; form: FormValues }

type Props = {
  category: Category
  defaultValues: Details | null
  onBack: () => void
  onNext: (details: Details) => void
}

export function DetailsStep({ category, defaultValues, onBack, onNext }: Props) {
  const { t, i18n } = useTranslation()
  const fieldError = useFieldError()
  const { fields, schema } = detailsSchema(category, i18n.language)
  const form = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaultValues?.form ?? {
      title: '',
      description: '',
      condition: '',
      attributes: emptyAttributes(fields),
    },
  })
  const { errors } = form.formState
  const attributeErrors = (errors.attributes ?? {}) as Record<
    string,
    { message?: string } | undefined
  >

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) => onNext({ values, form: form.getValues() }))}
    >
      <TextField
        label={t('wizard.titleField')}
        placeholder={t('wizard.titlePlaceholder')}
        error={fieldError(errors.title?.message)}
        {...form.register('title')}
      />
      <TextArea
        label={t('wizard.description')}
        hint={t('wizard.descriptionHint')}
        error={fieldError(errors.description?.message)}
        {...form.register('description')}
      />
      <SelectField
        label={t('wizard.condition')}
        error={fieldError(errors.condition?.message)}
        {...form.register('condition')}
      >
        <option value="">—</option>
        {conditions.map((condition) => (
          <option key={condition} value={condition}>
            {t(`condition.${condition}`)}
          </option>
        ))}
      </SelectField>

      {fields.length > 0 && (
        <fieldset className="mt-2 grid gap-5 rounded-lg bg-paper p-5 sm:grid-cols-2">
          <legend className="sr-only">{category.name}</legend>
          <p className="font-mono text-xs tracking-widest text-muted uppercase sm:col-span-2">
            {category.name}
          </p>
          {fields.map((field) => {
            const name = `attributes.${field.name}` as const
            const label = field.required
              ? field.label
              : `${field.label} (${t('ui.optional').toLowerCase()})`
            const error = fieldError(attributeErrors[field.name]?.message)
            switch (field.kind) {
              case 'boolean':
                return (
                  <div key={field.name} className="self-end sm:col-span-2">
                    <Checkbox label={field.label} {...form.register(name)} />
                  </div>
                )
              case 'select':
                return (
                  <SelectField
                    key={field.name}
                    label={label}
                    error={error}
                    {...form.register(name)}
                  >
                    <option value="">—</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                )
              case 'integer':
              case 'number':
                return (
                  <TextField
                    key={field.name}
                    label={label}
                    inputMode={field.kind === 'integer' ? 'numeric' : 'decimal'}
                    error={error}
                    {...form.register(name)}
                  />
                )
              default:
                return (
                  <TextField
                    key={field.name}
                    label={label}
                    maxLength={field.maxLength}
                    error={error}
                    {...form.register(name)}
                  />
                )
            }
          })}
        </fieldset>
      )}

      <StepNav onBack={onBack} />
    </form>
  )
}

export function StepNav({
  onBack,
  submitLabel,
  submitting,
}: {
  onBack?: () => void
  submitLabel?: string
  submitting?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-6">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          {t('wizard.back')}
        </Button>
      ) : (
        <span />
      )}
      <Button
        type="submit"
        variant={submitLabel ? 'pop' : 'primary'}
        size={submitLabel ? 'lg' : 'md'}
        loading={submitting}
      >
        {submitLabel ?? t('wizard.next')}
      </Button>
    </div>
  )
}
