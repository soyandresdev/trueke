/**
 * Capturas y GIF de la documentación: `pnpm screenshots` → docs/screenshots/{en,es}/.
 * El idioma sale de SCREENSHOTS_LANG. No comprueba nada: para eso están los otros specs.
 */
import { expect, test, type Browser, type BrowserContextOptions, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'

import { login } from '../support.ts'

const LANG = process.env.SCREENSHOTS_LANG === 'es' ? 'es' : 'en'
const OUT = new URL(`../../../docs/screenshots/${LANG}/`, import.meta.url).pathname
const LOCALE = LANG === 'es' ? 'es-CO' : 'en-US'
const LAURA = '+573000000002'
const SARA = '+573000000001'

// Textos de la interfaz que usa el script, en cada idioma.
const ui = {
  en: {
    photography: 'Photography',
    phone: '128 GB phone',
    camera: 'Mirrorless camera with kit lens',
    chat: 'Chat with Trueke',
    inReview: 'In review',
    offered: 'Offer made',
    accepted: 'Accepted',
    makeOffer: 'Make an offer',
    amount: 'Amount (COP)',
    sendOffer: 'Send offer',
    acceptOffer: 'Accept offer',
    accept: 'Accept',
  },
  es: {
    photography: 'Fotografía',
    phone: 'Celular de 128 GB',
    camera: 'Cámara mirrorless con lente kit',
    chat: 'Chat con Trueke',
    inReview: 'En revisión',
    offered: 'Con oferta',
    accepted: 'Aceptada',
    makeOffer: 'Hacer oferta',
    amount: 'Monto (COP)',
    sendOffer: 'Enviar oferta',
    acceptOffer: 'Aceptar oferta',
    accept: 'Aceptar',
  },
}[LANG]

test.describe.configure({ mode: 'serial' })
test.use({ locale: LOCALE })
test.beforeAll(() => mkdirSync(OUT, { recursive: true }))

// Los códigos OTP son de un solo uso y no se puede pedir otro antes de un minuto: cada persona entra
// una vez y los demás navegadores reutilizan su sesión.
const sessions = new Map<string, BrowserContextOptions['storageState']>()

async function signedIn(browser: Browser, phone: string, options: BrowserContextOptions = {}) {
  const context = await browser.newContext({
    locale: LOCALE,
    ...options,
    storageState: sessions.get(phone),
  })
  const page = await context.newPage()
  if (!sessions.has(phone)) {
    // El login lo escribe `support.ts` en español: se entra en español y luego se elige el idioma.
    await page.goto('/')
    await page.locator('header select').selectOption('es')
    await login(page, phone)
    await page.locator('header select').selectOption(LANG)
    sessions.set(phone, await context.storageState())
  }
  return page
}

async function shot(page: Page, name: string, fullPage = false) {
  // Chrome no carga imágenes lazy fuera de pantalla en capturas de página completa.
  await page.evaluate(() =>
    document.querySelectorAll('img').forEach((img) => (img.loading = 'eager')),
  )
  await page.waitForLoadState('networkidle')
  // networkidle no garantiza que las fotos ya estén decodificadas.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('img')].every((img) => img.complete && img.naturalWidth > 0),
  )
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage })
}

test('landing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: ui.photography })).toBeVisible()
  await shot(page, 'landing')
})

test('landing on mobile', async ({ browser }) => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: LOCALE,
  })
  await page.goto('/')
  await shot(page, 'landing-mobile')
  await page.close()
})

test('seller: listings, offer with chat, new listing', async ({ browser }) => {
  const page = await signedIn(browser, LAURA, { viewport: { width: 1440, height: 900 } })
  await page.goto('/publicaciones')
  await expect(page.getByText(ui.phone)).toBeVisible()
  await shot(page, 'my-listings')

  await page.getByText(ui.phone).click()
  await expect(page.getByRole('region', { name: ui.chat })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1300 })
  await shot(page, 'listing-offer')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/publicaciones/nueva')
  await expect(page.getByRole('button', { name: ui.photography })).toBeVisible()
  await shot(page, 'new-listing')
})

test('operator panel', async ({ browser }) => {
  const page = await signedIn(browser, SARA, { viewport: { width: 1440, height: 900 } })
  await page.goto('/publicaciones')
  await expect(page.getByRole('table')).toBeVisible()
  await shot(page, 'operator-panel')
})

test('GIF: the offer arrives live and the seller accepts it', async ({ browser }) => {
  const videoDir = `${OUT}.video`
  const sara = await signedIn(browser, SARA)
  const page = await signedIn(browser, LAURA, {
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  })
  const laura = page.context()
  // La cámara mirrorless está en revisión en los datos de demo.
  await page.goto('/publicaciones')
  await page.getByText(ui.camera).click()
  await expect(page.getByText(ui.inReview, { exact: true })).toBeVisible()
  await page.waitForTimeout(1200)

  // Sara oferta desde su navegador (no sale en el vídeo).
  await sara.goto(page.url())
  await sara.getByRole('button', { name: ui.makeOffer }).click()
  await sara.getByLabel(ui.amount).fill('2300000')
  await sara.getByRole('button', { name: ui.sendOffer }).click()

  await expect(page.getByText(ui.offered, { exact: true })).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: ui.acceptOffer }).click()
  await page.waitForTimeout(1200)
  await page.getByRole('dialog').getByRole('button', { name: ui.accept, exact: true }).click()
  await expect(page.getByText(ui.accepted, { exact: true })).toBeVisible()
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
    `${OUT}demo-offer.gif`,
  ])
  rmSync(videoDir, { recursive: true })
})
