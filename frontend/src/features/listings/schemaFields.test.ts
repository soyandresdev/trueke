import { describe, expect, it } from 'vitest'

import {
  attributesSchema,
  displayAttribute,
  emptyAttributes,
  fieldsFromSchema,
} from './schemaFields'

// Igual que la categoría de demo "Tecnología" + un enum como el de "Instrumentos".
const schema = {
  type: 'object',
  properties: {
    brand: { type: 'string', title: 'Marca', 'x-title-en': 'Brand', maxLength: 10 },
    storage_gb: { type: 'integer', title: 'Almacenamiento (GB)', minimum: 0 },
    includes_box: { type: 'boolean', title: '¿Incluye caja?' },
    kind: {
      type: 'string',
      title: 'Tipo',
      enum: ['string', 'keys'],
      'x-labels': { string: 'Cuerda', keys: 'Teclado' },
    },
    weird: { type: 'array' },
  },
  required: ['brand', 'kind'],
  additionalProperties: false,
}

describe('campos desde JSON Schema', () => {
  const fields = fieldsFromSchema(schema, 'es')

  it('lee tipos, títulos, obligatorios y opciones; ignora lo no soportado', () => {
    expect(fields.map((f) => [f.name, f.kind, f.label, f.required])).toEqual([
      ['brand', 'text', 'Marca', true],
      ['storage_gb', 'integer', 'Almacenamiento (GB)', false],
      ['includes_box', 'boolean', '¿Incluye caja?', false],
      ['kind', 'select', 'Tipo', true],
    ])
    expect(fieldsFromSchema(schema, 'en')[0]!.label).toBe('Brand')
  })

  it('convierte los valores del formulario en lo que espera la API', () => {
    const result = attributesSchema(fields).parse({
      ...emptyAttributes(fields),
      brand: ' Sony ',
      storage_gb: '256',
      kind: 'keys',
    })
    expect(result).toEqual({ brand: 'Sony', storage_gb: 256, includes_box: false, kind: 'keys' })
  })

  it('valida obligatorios, enteros, mínimos y longitud', () => {
    const result = attributesSchema(fields).safeParse({
      brand: 'x'.repeat(11),
      storage_gb: '-1.5',
      includes_box: false,
      kind: '',
    })
    expect(result.success).toBe(false)
    const issues = Object.fromEntries(result.error!.issues.map((i) => [i.path[0], i.message]))
    expect(issues).toMatchObject({
      brand: 'validation.maxLength',
      storage_gb: 'validation.integer',
      kind: 'validation.required',
    })
  })

  it('muestra las etiquetas de los valores', () => {
    const [, , box, kind] = fields
    expect(displayAttribute(kind!, 'keys', { yes: 'Sí', no: 'No' })).toBe('Teclado')
    expect(displayAttribute(box!, true, { yes: 'Sí', no: 'No' })).toBe('Sí')
    expect(displayAttribute(kind!, undefined, { yes: 'Sí', no: 'No' })).toBeNull()
  })
})
