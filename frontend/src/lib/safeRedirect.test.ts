import { describe, expect, it } from 'vitest'

import { safeRedirect } from './safeRedirect'

describe('safeRedirect', () => {
  it.each(['/cuenta', '/publicaciones?estado=offered'])('acepta rutas internas: %s', (path) => {
    expect(safeRedirect(path)).toBe(path)
  })
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'cuenta', 42, undefined])(
    'rechaza %s',
    (value) => {
      expect(safeRedirect(value)).toBeUndefined()
    },
  )
})
