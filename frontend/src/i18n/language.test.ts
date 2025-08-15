import { describe, expect, it } from 'vitest'

import i18n from '.'

describe('idioma', () => {
  it('un idioma regional del navegador queda como el idioma base', async () => {
    await i18n.changeLanguage('en-US')
    // changeLanguage directo no pasa por el detector; lo que importa es el idioma resuelto.
    expect(i18n.resolvedLanguage).toBe('en')
    const detector = i18n.services.languageDetector as {
      options: { convertDetectedLanguage: (l: string) => string }
    }
    expect(detector.options.convertDetectedLanguage('en-US')).toBe('en')
    expect(detector.options.convertDetectedLanguage('es-CO')).toBe('es')
  })
})
