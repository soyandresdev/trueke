/** Páginas públicas y límites de acceso, contra el backend real. */
import { expect, test } from '@playwright/test'

import { login } from './support.ts'

test('la landing carga las categorías del backend y suscribe al newsletter', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Lo que ya no usas')
  await expect(page.getByRole('link', { name: 'Bicicletas y movilidad' })).toBeVisible()

  await page.getByPlaceholder('tu@email.com').fill('e2e@example.com')
  await page.getByRole('button', { name: 'Suscribirme' }).click()
  await expect(page.getByText(/Te escribiremos solo cuando valga la pena/)).toBeVisible()
})

test('las páginas privadas piden entrar y luego vuelven', async ({ page }) => {
  await page.goto('/publicaciones/nueva')
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpublicaciones%2Fnueva/)
  await login(page, '+573009990003')
  await expect(page).toHaveURL(/\/publicaciones\/nueva$/)
  await expect(page.getByRole('heading', { name: '¿Qué quieres vender?' })).toBeVisible()
})

test('un vendedor no puede ver publicaciones ajenas', async ({ page }) => {
  await login(page, '+573009990004')
  // La publicación 1 es de otra persona (la crea sale.spec.ts) o no existe: en ambos casos, 404.
  await page.goto('/publicaciones/1')
  await expect(page.getByText('Esta página no existe.')).toBeVisible()
})

test('el idioma se puede cambiar a inglés', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What you no longer use')
  await expect(page.getByRole('link', { name: 'Bikes & mobility' })).toBeVisible() // también lo que viene del backend
})

test.describe('navegador en inglés', () => {
  test.use({ locale: 'en-US' })

  test('la app y los datos del backend salen en inglés', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('What you no longer use')
    await expect(page.getByRole('link', { name: 'Musical instruments' })).toBeVisible()
  })
})

test.describe('navegador en un idioma que no tenemos', () => {
  test.use({ locale: 'fr-FR' })

  test('usa el inglés', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('What you no longer use')
  })
})
