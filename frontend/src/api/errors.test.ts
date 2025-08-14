import type { UseFormSetError } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import { applyApiErrors } from './errors'

type Values = { phone: string; code: string }

describe('applyApiErrors', () => {
  it('reparte errores por campo y devuelve el general', () => {
    const setError = vi.fn<UseFormSetError<Values>>()
    const general = applyApiErrors<Values>(
      { phone: ['Mal'], otro: ['Campo que no está en el formulario'] },
      setError,
      ['phone'],
    )
    expect(setError).toHaveBeenCalledWith('phone', { type: 'server', message: 'Mal' })
    expect(general).toBe('Campo que no está en el formulario')
  })

  it('"code" como string es el código del error, no un campo', () => {
    const setError = vi.fn<UseFormSetError<Values>>()
    expect(
      applyApiErrors<Values>({ code: 'invalid_code', detail: 'Incorrecto' }, setError, ['code']),
    ).toBe('Incorrecto')
    expect(setError).not.toHaveBeenCalled()
    applyApiErrors<Values>({ code: ['Código inválido.'] }, setError, ['code'])
    expect(setError).toHaveBeenCalledWith('code', { type: 'server', message: 'Código inválido.' })
  })
})
