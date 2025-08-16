/** Validaciones de una publicación, compartidas por el asistente de alta y la edición. */
import { z } from 'zod'

import type { Category } from '@/api/types'

import { attributesSchema, fieldsFromSchema, type AttributeValues } from '../schemaFields'

export const conditions = ['new', 'like_new', 'good', 'fair', 'for_parts'] as const

/** Nombre, descripción, estado y campos de la categoría. */
export function detailsShape(category: Category, language: string) {
  const fields = fieldsFromSchema(category.fields_schema, language)
  return {
    fields,
    shape: {
      title: z.string().trim().min(3, 'validation.required').max(120, 'validation.maxLength'),
      description: z
        .string()
        .trim()
        .min(10, 'validation.description')
        .max(4000, 'validation.maxLength'),
      condition: z.enum(conditions, 'validation.required'),
      attributes: attributesSchema(fields),
    },
  }
}

/** Ciudad, dirección de recogida y si es original. */
export const pickupShape = {
  city: z.string().trim().min(2, 'validation.required').max(80, 'validation.maxLength'),
  pickup_address: z.string().trim().min(5, 'validation.required').max(200, 'validation.maxLength'),
  is_original: z.boolean(),
}

/** Valores tal como los manejan los campos del formulario (antes de validar). */
export type DetailsFormValues = {
  title: string
  description: string
  condition: string
  attributes: AttributeValues
}
export type PickupFormValues = { city: string; pickup_address: string; is_original: boolean }

/** Lo guardado en la API → valores de los campos (los números se editan como texto). */
export function attributesToForm(attributes: unknown): AttributeValues {
  return Object.fromEntries(
    Object.entries((attributes ?? {}) as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? value : String(value ?? ''),
    ]),
  )
}
