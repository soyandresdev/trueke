import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/** Forma de los errores de la API: `{code, detail}` o `{campo: ["mensaje"]}` (DRF). */
export type ApiErrorBody = Record<string, unknown> & { code?: unknown; detail?: unknown }

const first = (value: unknown) =>
  Array.isArray(value) ? String(value[0]) : typeof value === 'string' ? value : null

/**
 * Pasa los errores por campo al formulario y devuelve el mensaje general, si lo hay.
 * Los mensajes ya vienen traducidos por el backend (Accept-Language).
 */
export function applyApiErrors<T extends FieldValues>(
  body: ApiErrorBody | undefined,
  setError: UseFormSetError<T>,
  fields: readonly Path<NoInfer<T>>[],
): string | null {
  if (!body) return null
  let general = first(body.detail) ?? first(body.non_field_errors)
  for (const [key, value] of Object.entries(body)) {
    const message = first(value)
    // `code` como string es el código del error; como lista, errores del campo "code".
    if (!message || key === 'detail' || (key === 'code' && typeof value === 'string')) continue
    if ((fields as readonly string[]).includes(key))
      setError(key as Path<T>, { type: 'server', message })
    else general ??= message
  }
  return general
}
