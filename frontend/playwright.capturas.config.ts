import { defineConfig } from '@playwright/test'

import base, { servers } from './playwright.config.ts'

/**
 * Capturas y GIF de la documentación (`pnpm capturas` → docs/capturas/). Usa los datos de demo
 * (`seed_demo`: Sara operadora, Laura y Mateo vendedores, 12 publicaciones en todos los estados).
 */
export default defineConfig({
  ...base,
  testDir: 'e2e/capturas',
  testIgnore: undefined,
  retries: 0,
  reporter: 'list',
  use: { ...base.use, locale: 'es-CO', trace: 'off', screenshot: 'off' },
  webServer: servers(['uv run python manage.py seed_demo']),
})
