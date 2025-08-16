import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { Category } from '@/api/types'
import { Checkbox, SelectField, TextArea, TextField } from '@/components/ui/fields'
import { useFieldError } from '@/lib/useFieldError'

import type { AttributeField } from '../schemaFields'
import { conditions, type DetailsFormValues, type PickupFormValues } from './schemas'

// Los campos se usan en formularios con distintos valores (asistente y edición); lo común son los nombres.
type Register = UseFormRegister<DetailsFormValues & PickupFormValues>
type Errors = FieldErrors<DetailsFormValues & PickupFormValues>

export function DetailsFields({
  register,
  errors,
  category,
  fields,
}: {
  register: Register
  errors: Errors
  category: Category
  fields: AttributeField[]
}) {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  const attributeErrors = (errors.attributes ?? {}) as Record<
    string,
    { message?: string } | undefined
  >

  return (
    <>
      <TextField
        label={t('wizard.titleField')}
        placeholder={t('wizard.titlePlaceholder')}
        error={fieldError(errors.title?.message)}
        {...register('title')}
      />
      <TextArea
        label={t('wizard.description')}
        hint={t('wizard.descriptionHint')}
        error={fieldError(errors.description?.message)}
        {...register('description')}
      />
      <SelectField
        label={t('wizard.condition')}
        error={fieldError(errors.condition?.message)}
        {...register('condition')}
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
                    <Checkbox label={field.label} {...register(name)} />
                  </div>
                )
              case 'select':
                return (
                  <SelectField key={field.name} label={label} error={error} {...register(name)}>
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
                    {...register(name)}
                  />
                )
              default:
                return (
                  <TextField
                    key={field.name}
                    label={label}
                    maxLength={field.maxLength}
                    error={error}
                    {...register(name)}
                  />
                )
            }
          })}
        </fieldset>
      )}
    </>
  )
}

export function PickupFields({ register, errors }: { register: Register; errors: Errors }) {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('wizard.city')}
          autoComplete="address-level2"
          error={fieldError(errors.city?.message)}
          {...register('city')}
        />
        <TextField
          label={t('wizard.address')}
          hint={t('wizard.addressHint')}
          autoComplete="street-address"
          error={fieldError(errors.pickup_address?.message)}
          {...register('pickup_address')}
        />
      </div>
      <Checkbox label={t('wizard.isOriginal')} {...register('is_original')} />
    </>
  )
}
