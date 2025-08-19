/** Genera las capturas de docs/capturas. No comprueba nada: para eso están los otros specs. */
import { expect, test, type Browser, type BrowserContextOptions, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'

import { login } from '../support.ts'

const OUT = new URL('../../../docs/capturas/', import.meta.url).pathname
const LAURA = '+573000000002'
const SARA = '+573000000001'

test.describe.configure({ mode: 'serial' })

// Los códigos OTP son de un solo uso y no se puede pedir otro antes de un minuto: cada persona entra
// una vez y los demás navegadores reutilizan su sesión.
const sessions = new Map<string, BrowserContextOptions['storageState']>()

async function signedIn(browser: Browser, phone: string, options: BrowserContextOptions = {}) {
  const context = await browser.newContext({
    locale: 'es-CO',
    ...options,
    storageState: sessions.get(phone),
  })
  const page = await context.newPage()
  if (!sessions.has(phone)) {
    await login(page, phone)
    sessions.set(phone, await context.storageState())
  }
  return page
}
test.beforeAll(() => mkdirSync(OUT, { recursive: true }))

async function shot(page: Page, name: string, fullPage = false) {
  // Chrome no carga imágenes lazy fuera de pantalla en capturas de página completa.
  await page.evaluate(() =>
    document.querySelectorAll('img').forEach((img) => (img.loading = 'eager')),
  )
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage })
}

test('landing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Fotografía' })).toBeVisible()
  await shot(page, 'landing')
})

test('landing en móvil', async ({ browser }) => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'es-CO',
  })
  await page.goto('/')
  await shot(page, 'landing-movil')
  await page.close()
})

test('vendedora: publicaciones, detalle con oferta y chat, asistente', async ({ browser }) => {
  const page = await signedIn(browser, LAURA, { viewport: { width: 1440, height: 900 } })
  await page.goto('/publicaciones')
  await expect(page.getByText('Celular de 128 GB')).toBeVisible()
  await shot(page, 'mis-publicaciones')

  await page.getByText('Celular de 128 GB').click()
  await expect(page.getByRole('region', { name: 'Chat con Trueke' })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1300 })
  await shot(page, 'detalle-oferta')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/publicaciones/nueva')
  await expect(page.getByRole('button', { name: 'Fotografía' })).toBeVisible()
  await shot(page, 'nueva-publicacion')
})

test('operadora: panel y ficha del vendedor', async ({ browser }) => {
  const page = await signedIn(browser, SARA, { viewport: { width: 1440, height: 900 } })
  await page.goto('/publicaciones')
  await expect(page.getByRole('table')).toBeVisible()
  await shot(page, 'panel-operador')
})

test('GIF: la oferta llega en vivo y la vendedora la acepta', async ({ browser }) => {
  const videoDir = `${OUT}.video`
  const sara = await signedIn(browser, SARA)
  const page = await signedIn(browser, LAURA, {
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  })
  const laura = page.context()
  // "Cámara mirrorless con lente kit" está en revisión en los datos de demo.
  await page.goto('/publicaciones')
  await page.getByText('Cámara mirrorless con lente kit').click()
  await expect(page.getByText('En revisión', { exact: true })).toBeVisible()
  await page.waitForTimeout(1200)

  // Sara oferta desde su navegador (no sale en el vídeo).
  await sara.goto(page.url())
  await sara.getByRole('button', { name: 'Hacer oferta' }).click()
  await sara.getByLabel('Monto (COP)').fill('2300000')
  await sara.getByRole('button', { name: 'Enviar oferta' }).click()

  await expect(page.getByText('Con oferta', { exact: true })).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Aceptar oferta' }).click()
  await page.waitForTimeout(1200)
  await page.getByRole('dialog').getByRole('button', { name: 'Aceptar' }).click()
  await expect(page.getByText('Aceptada', { exact: true })).toBeVisible()
  await page.waitForTimeout(1500)
  await laura.close()
  await sara.context().close()

  // webm → gif con paleta propia (colores fieles, archivo pequeño).
  const video = readdirSync(videoDir).find((file) => file.endsWith('.webm'))!
  renameSync(`${videoDir}/${video}`, `${videoDir}/demo.webm`)
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    `${videoDir}/demo.webm`,
    '-vf',
    'fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer',
    `${OUT}demo-oferta.gif`,
  ])
  rmSync(videoDir, { recursive: true })
})
