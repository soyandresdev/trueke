/**
 * Flujo completo de una venta, con dos personas en navegadores distintos:
 * la vendedora publica → la operadora oferta → la vendedora acepta → chat → recogida → venta completada.
 * Cada paso de una persona tiene que llegarle en vivo a la otra (WebSocket), sin recargar.
 */
import { expect, test, type Page } from '@playwright/test'

import { brandImage, fixture, login } from './support.ts'

const SELLER = '+573009990002'
const OPERATOR = '+573009990001'
const TITLE = 'Teclado controlador MIDI 49 teclas'

test.describe.configure({ mode: 'serial' })

let seller: Page
let operator: Page
let listingUrl: string

test.beforeAll(async ({ browser }) => {
  seller = await (await browser.newContext()).newPage()
  operator = await (await browser.newContext()).newPage()
})

test.afterAll(async () => {
  await seller.context().close()
  await operator.context().close()
})

test('la vendedora entra por primera vez y completa su perfil', async () => {
  await login(seller, SELLER)
  // Cuenta nueva sin perfil: la app la lleva a "Mi cuenta".
  await expect(seller).toHaveURL(/\/cuenta$/)
  await expect(seller.getByText('Completa tu perfil para vender')).toBeVisible()

  await seller.getByLabel('Nombre').fill('Laura')
  await seller.getByLabel('Apellido').fill('Gómez')
  await seller.getByLabel('Tipo de documento').selectOption('national_id')
  await seller.getByLabel('Número de documento').fill('1020304050')
  await seller.getByRole('button', { name: 'Guardar' }).click()
  await expect(seller.getByText('Datos guardados.')).toBeVisible()

  for (const doc of ['Documento de identidad', 'Certificado bancario']) {
    const row = seller.getByRole('listitem').filter({ hasText: doc })
    await row.getByLabel('Subir').setInputFiles(fixture('documento.pdf'))
    await expect(row.getByText('Subido')).toBeVisible()
  }
  await expect(seller.getByText('Completa tu perfil para vender')).toBeHidden()
})

test('la vendedora publica un artículo con el asistente', async () => {
  await seller.getByRole('link', { name: 'Mis publicaciones' }).first().click()
  await seller.getByRole('link', { name: 'Nueva publicación' }).click()

  await seller.getByRole('button', { name: 'Instrumentos musicales' }).click()
  await seller.getByLabel('Nombre del artículo').fill(TITLE)
  await seller
    .getByLabel('Descripción')
    .fill('Todas las teclas y perillas funcionan. Incluye cable USB.')
  await seller.getByLabel('Estado del artículo').selectOption('like_new')
  await seller.getByLabel('Tipo').selectOption('keys')
  await seller.getByLabel('Marca (opcional)').fill('Arturia')
  await seller.getByRole('button', { name: 'Continuar' }).click()

  await seller.getByLabel('Añadir fotos').setInputFiles(brandImage('demo-teclado.jpg'))
  await expect(seller.getByText('Portada', { exact: true })).toBeVisible()
  await seller.getByRole('button', { name: 'Continuar' }).click()

  await seller.getByLabel('Ciudad').fill('Bogotá')
  await seller.getByLabel('Dirección de recogida').fill('Calle 85 # 12-40')
  await seller.getByLabel('Acepto los términos y condiciones de Trueke').check()
  await seller.getByRole('button', { name: 'Publicar' }).click()

  await expect(seller.getByRole('heading', { name: TITLE })).toBeVisible()
  await expect(seller.getByText('En revisión', { exact: true })).toBeVisible()
  await expect(seller.getByRole('img', { name: TITLE })).toBeVisible()
  listingUrl = new URL(seller.url()).pathname
})

test('la operadora la encuentra en su panel y hace una oferta', async () => {
  await login(operator, OPERATOR)
  await operator.goto('/publicaciones')
  await operator.getByRole('searchbox', { name: 'Buscar' }).fill('MIDI')
  await operator.getByRole('table').getByRole('link', { name: TITLE }).click()
  await expect(operator).toHaveURL(listingUrl)

  // Ficha de la vendedora con sus documentos.
  const card = operator.getByRole('region', { name: 'Laura Gómez' })
  await expect(card.getByText('Perfil completo')).toBeVisible()
  await expect(card.getByRole('button', { name: 'Certificado bancario' })).toBeVisible()

  await operator.getByRole('button', { name: 'Hacer oferta' }).click()
  const dialog = operator.getByRole('dialog', { name: 'Hacer una oferta' })
  await dialog.getByLabel('Monto (COP)').fill('380000')
  await dialog.getByRole('button', { name: 'Enviar oferta' }).click()
  await expect(operator.getByText('Oferta enviada.')).toBeVisible()
})

test('a la vendedora le llega la oferta en vivo y la acepta', async () => {
  // La vendedora sigue en el detalle, sin recargar.
  await expect(seller.getByText('Con oferta', { exact: true })).toBeVisible()
  await expect(seller.getByRole('figure')).toContainText('380.000')
  await expect(seller.getByText(/Tienes una oferta por «Teclado/)).toBeVisible() // aviso emergente

  await seller.getByRole('button', { name: 'Aceptar oferta' }).click()
  await seller
    .getByRole('dialog', { name: '¿Aceptas la oferta?' })
    .getByRole('button', { name: 'Aceptar' })
    .click()
  await expect(seller.getByText('Aceptada', { exact: true })).toBeVisible()
  await expect(operator.getByText('Aceptada', { exact: true })).toBeVisible()
})

test('chatean y los mensajes llegan en vivo con su doble check', async () => {
  await seller.getByLabel('Escribe un mensaje…').fill('¿Qué día pasan a recogerlo?')
  await seller.getByLabel('Escribe un mensaje…').press('Enter')

  const operatorChat = operator.getByRole('region', { name: 'Chat con el vendedor' })
  await expect(operatorChat.getByText('¿Qué día pasan a recogerlo?')).toBeVisible()
  // La operadora tiene el chat abierto: el mensaje queda leído y la vendedora lo ve.
  await expect(
    seller.getByRole('region', { name: 'Chat con Trueke' }).getByText('Leído'),
  ).toBeAttached()

  await operatorChat.getByLabel('Escribe un mensaje…').fill('El jueves entre 2 y 5 p. m.')
  await operatorChat.getByLabel('Escribe un mensaje…').press('Enter')
  await expect(seller.getByText('El jueves entre 2 y 5 p. m.')).toBeVisible()
})

test('la operadora coordina la recogida y completa la venta', async () => {
  await operator.getByRole('button', { name: 'Coordinar recogida' }).click()
  const dialog = operator.getByRole('dialog', { name: 'Coordinar la recogida' })
  await dialog.getByLabel('¿Quién se encarga?').selectOption('platform')
  await dialog.getByLabel('Fecha').fill('2026-09-24')
  await dialog.getByLabel('Indicaciones').fill('Portería del edificio.')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(seller.getByText('Recogida enviada', { exact: true })).toBeVisible()
  await expect(seller.getByText('Portería del edificio.')).toBeVisible()

  await operator.getByRole('button', { name: 'Completar venta' }).click()
  await operator
    .getByRole('dialog', { name: '¿Completar la venta?' })
    .getByRole('button', { name: 'Completar' })
    .click()
  await expect(seller.getByText('Completada', { exact: true })).toBeVisible()
  await expect(seller.getByRole('figure')).toContainText('Vendido por')
})

test('la vendedora ve todo el historial y sus notificaciones', async () => {
  const history = seller.getByRole('heading', { name: 'Historial' }).locator('..')
  for (const step of [
    'Publicación creada',
    'Oferta enviada',
    'Oferta aceptada',
    'Recogida coordinada',
    'Venta completada',
  ]) {
    await expect(history.getByText(step)).toBeVisible()
  }
  await seller.getByRole('button', { name: /^Notificaciones/ }).click()
  await expect(
    seller.getByText('Venta completada: «Teclado controlador MIDI 49 teclas».'),
  ).toBeVisible()
})
