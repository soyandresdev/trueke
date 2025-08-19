import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'

// Inglés por defecto; español si el navegador o la persona lo eligen.
export const languages = ['en', 'es'] as const
export type Language = (typeof languages)[number]

// El HTML declara el idioma actual (también el detectado al arrancar: por eso va antes de init).
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    fallbackLng: 'en',
    supportedLngs: languages,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false }, // React ya escapa
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // `en-US` → `en`: el resto de la app (fechas, campos de categoría, Accept-Language) compara con `es`/`en`.
      convertDetectedLanguage: (lng: string) => lng.split('-')[0]!,
    },
  })

export default i18n
