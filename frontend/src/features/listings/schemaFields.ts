/**
 * Campos extra de una categoría a partir de su JSON Schema (backend/apps/listings/schema.py).
 * Se soporta el subconjunto que usa el admin: string (con `enum` o `maxLength`), integer, number y boolean.
 * Textos: `title` (español), `x-title-en`; opciones de un enum: `x-labels` / `x-labels-en`.
 * El backend vuelve a validar con el esquema completo.
 */
import { z } from 'zod'

type Base = { name: string; label: string; required: boolean }
export type AttributeField =
  | (Base & { kind: 'text'; maxLength?: number })
  | (Base & { kind: 'integer' | 'number'; min?: number; max?: number })
  | (Base & { kind: 'boolean' })
  | (Base & { kind: 'select'; options: { value: string; label: string }[] })

type JsonProperty = {
  type?: string
  title?: string
  'x-title-en'?: string
  enum?: unknown[]
  'x-labels'?: Record<string, string>
  'x-labels-en'?: Record<string, string>
  maxLength?: number
  minimum?: number
  maximum?: number
}
type JsonObjectSchema = { properties?: Record<string, JsonProperty>; required?: string[] }

export function fieldsFromSchema(schema: unknown, language: string): AttributeField[] {
  const { properties = {}, required = [] } = (schema ?? {}) as JsonObjectSchema
  const en = language === 'en'
  return Object.entries(properties).flatMap(([name, prop]): AttributeField[] => {
    const base = {
      name,
      label: (en && prop['x-title-en']) || prop.title || name,
      required: required.includes(name),
    }
    if (prop.enum) {
      const labels = (en && prop['x-labels-en']) || prop['x-labels'] || {}
      const options = prop.enum.map((value) => ({
        value: String(value),
        label: labels[String(value)] ?? String(value),
      }))
      return [{ ...base, kind: 'select', options }]
    }
    switch (prop.type) {
      case 'string':
        return [{ ...base, kind: 'text', maxLength: prop.maxLength }]
      case 'integer':
      case 'number':
        return [{ ...base, kind: prop.type, min: prop.minimum, max: prop.maximum }]
      case 'boolean':
        return [{ ...base, kind: 'boolean' }]
      default:
        return [] // tipo no soportado en el formulario: lo valida solo el backend
    }
  })
}

/** Valores del formulario: los inputs de texto y número dan strings; las casillas, booleanos. */
export type AttributeValues = Record<string, string | boolean>

/** Esquema Zod para los valores del formulario. La salida ya es el objeto que espera la API. */
export function attributesSchema(fields: AttributeField[]) {
  const shape: Record<string, z.ZodType> = {}
  for (const field of fields) {
    switch (field.kind) {
      case 'boolean':
        shape[field.name] = z.boolean()
        break
      case 'integer':
      case 'number': {
        let number = z.number('validation.number')
        if (field.kind === 'integer') number = number.int('validation.integer')
        if (field.min !== undefined) number = number.min(field.min, 'validation.min')
        if (field.max !== undefined) number = number.max(field.max, 'validation.max')
        shape[field.name] = z
          .string()
          .trim()
          .transform((value) => (value === '' ? undefined : Number(value)))
          .pipe(field.required ? number : number.optional())
          .refine((value) => !field.required || value !== undefined, 'validation.required')
        break
      }
      default: {
        let text = z.string().trim()
        if (field.kind === 'text' && field.maxLength)
          text = text.max(field.maxLength, 'validation.maxLength')
        shape[field.name] = field.required
          ? text.min(1, 'validation.required')
          : text.transform((value) => (value === '' ? undefined : value))
      }
    }
  }
  return z
    .object(shape)
    .transform(
      (values) =>
        Object.fromEntries(
          Object.entries(values).filter(([, value]) => value !== undefined),
        ) as Record<string, unknown>,
    )
}

export function emptyAttributes(fields: AttributeField[]): AttributeValues {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.kind === 'boolean' ? false : '']),
  )
}

/** Texto para mostrar un valor guardado (el detalle de la publicación). */
export function displayAttribute(
  field: AttributeField,
  value: unknown,
  yesNo: { yes: string; no: string },
) {
  if (value === undefined || value === null || value === '') return null
  if (field.kind === 'boolean') return value ? yesNo.yes : yesNo.no
  if (field.kind === 'select')
    return field.options.find((option) => option.value === String(value))?.label ?? String(value)
  return String(value)
}
