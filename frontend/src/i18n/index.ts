import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import es from './locales/es.json'

export const languages = ['es', 'en'] as const
export type Language = (typeof languages)[number]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    fallbackLng: 'es',
    supportedLngs: languages,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false }, // React ya escapa
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  })

// El backend responde en el idioma de `Accept-Language` y el HTML declara el idioma actual.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
