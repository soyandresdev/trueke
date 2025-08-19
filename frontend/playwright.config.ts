import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'

/**
 * Pruebas de extremo a extremo: backend real (SQLite temporal, sin Redis, OTP en un archivo)
 * y la app compilada. No usa los puertos ni los datos de `make dev`.
 */
const tmp = fileURLToPath(new URL('./e2e/.tmp', import.meta.url))
export const OTP_OUTBOX = `${tmp}/otp.jsonl`
const BACKEND = 'http://127.0.0.1:8011'
const FRONTEND = 'http://localhost:5174'

type Server = Extract<NonNullable<PlaywrightTestConfig['webServer']>, readonly unknown[]>[number]

/** Backend y frontend para las pruebas. `setup` añade comandos antes de arrancar (p. ej. datos de demo). */
export function servers(setup: string[] = []): Server[] {
  return [
    {
      cwd: '../backend',
      command: [
        `rm -rf ${tmp} && mkdir -p ${tmp}`,
        'uv run python manage.py migrate -v0',
        'uv run python manage.py load_demo_categories',
        'uv run python manage.py create_operator 3009990001 --first-name Ana --last-name Operadora --language es',
        ...setup,
        'uv run python manage.py runserver 127.0.0.1:8011 --noreload',
      ].join(' && '),
      url: `${BACKEND}/api/categories/`,
      reuseExistingServer: false, // siempre una base de datos limpia
      timeout: 120_000,
      env: {
        DEBUG: 'true',
        SECRET_KEY: 'e2e-secret-key-that-is-long-enough-for-hs256',
        DATABASE_URL: `sqlite:///${tmp}/db.sqlite3`,
        REDIS_URL: '',
        MEDIA_ROOT: `${tmp}/media`,
        PRIVATE_MEDIA_ROOT: `${tmp}/private-media`,
        OTP_PROVIDER: 'outbox',
        OTP_OUTBOX_PATH: OTP_OUTBOX,
        OTP_THROTTLE_RATE: '1000/hour',
        ALLOWED_HOSTS: 'localhost,127.0.0.1',
        CORS_ALLOWED_ORIGINS: FRONTEND,
      },
    },
    {
      // La app compilada (lo que se despliega); preview usa el mismo proxy que el servidor de desarrollo.
      command: 'pnpm exec vite build && pnpm exec vite preview --port 5174 --strictPort',
      url: FRONTEND,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_BACKEND_URL: BACKEND },
    },
  ]
}

export default defineConfig({
  testDir: 'e2e',
  testIgnore: 'screenshots/**',
  fullyParallel: false,
  workers: 1, // comparten base de datos
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: FRONTEND,
    locale: 'es-CO',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: servers(),
})
