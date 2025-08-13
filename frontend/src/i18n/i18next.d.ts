import 'i18next'

import type es from './locales/es.json'

// Claves de traducción tipadas: `t('home.tittle')` no compila.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof es }
  }
}
