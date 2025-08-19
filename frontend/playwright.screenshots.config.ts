import { defineConfig } from '@playwright/test'

import base, { servers } from './playwright.config.ts'

/**
 * Capturas y GIF de la documentación (`pnpm screenshots` → docs/screenshots/{en,es}/). Usa los datos de demo
 * (`seed_demo`: Sara operadora, Laura y Mateo vendedores, 12 publicaciones en todos los estados).
 */
export default defineConfig({
  ...base,
  testDir: 'e2e/screenshots',
  testIgnore: undefined,
  retries: 0,
  reporter: 'list',
  use: { ...base.use, trace: 'off', screenshot: 'off' },
  // Datos de demo en el idioma de las capturas (títulos, chats, idioma de los usuarios).
  webServer: servers([
    `uv run python manage.py seed_demo --language ${process.env.SCREENSHOTS_LANG === 'es' ? 'es' : 'en'}`,
  ]),
})
