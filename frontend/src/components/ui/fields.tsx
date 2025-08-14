import { useId, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

type FieldProps = {
  label: ReactNode
  hint?: ReactNode
  error?: string
}

const control =
  'w-full rounded-md border bg-white px-3.5 text-ink transition placeholder:text-muted ' +
  'focus:border-blue focus:ring-2 focus:ring-blue-soft focus:outline-none ' +
  'disabled:bg-paper disabled:text-muted'

/** Etiqueta, ayuda y error enlazados al control por id (lectores de pantalla). */
function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-tomato" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

function a11y(id: string, { hint, error }: FieldProps) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  }
}

const border = (error?: string) => (error ? 'border-tomato' : 'border-line')

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & ComponentProps<'input'>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        className={cn(control, 'h-11', border(error), className)}
        {...a11y(id, { label, hint, error })}
        {...props}
      />
    </FieldShell>
  )
}

export function TextArea({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & ComponentProps<'textarea'>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        rows={4}
        className={cn(control, 'py-2.5', border(error), className)}
        {...a11y(id, { label, hint, error })}
        {...props}
      />
    </FieldShell>
  )
}

export function SelectField({
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & ComponentProps<'select'>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        className={cn(
          control,
          'h-11 appearance-none bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10',
          border(error),
          className,
        )}
        style={{ backgroundImage: chevron }}
        {...a11y(id, { label, hint, error })}
        {...props}
      />
    </FieldShell>
  )
}

export function Checkbox({
  label,
  error,
  className,
  ...props
}: Omit<FieldProps, 'hint'> & ComponentProps<'input'>) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className={cn('mt-0.5 size-5 shrink-0 cursor-pointer rounded-sm accent-blue', className)}
          {...a11y(id, { label, error })}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="text-sm text-tomato" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2314141a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
