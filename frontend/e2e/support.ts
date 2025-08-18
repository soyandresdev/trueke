import { expect, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

import { OTP_OUTBOX } from '../playwright.config.ts'

/** Códigos enviados a `phone` (en E2E el backend los escribe en un archivo en vez de mandar un SMS). */
function codesFor(phone: string): string[] {
  if (!existsSync(OTP_OUTBOX)) return []
  return readFileSync(OTP_OUTBOX, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { phone: string; code: string })
    .filter((entry) => entry.phone === phone)
    .map((entry) => entry.code)
}

/** Entra con OTP por la interfaz, como lo haría una persona. `phone` en formato E.164. */
export async function login(page: Page, phone: string) {
  const before = codesFor(phone).length
  // Si una página privada ya nos trajo a /entrar?redirect=…, se entra desde ahí para conservar el destino.
  if (!new URL(page.url(), 'http://x').pathname.startsWith('/entrar')) await page.goto('/entrar')
  await page.getByLabel('Teléfono').fill(phone)
  await page.getByRole('button', { name: 'Enviar código' }).click()
  await expect
    .poll(() => codesFor(phone).length, { message: 'no llegó el código OTP' })
    .toBeGreaterThan(before)
  // Con los 6 dígitos el formulario se envía solo.
  await page.getByLabel('Código').fill(codesFor(phone).at(-1)!)
  await expect(page).not.toHaveURL(/\/entrar/)
}

export const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url).pathname
export const brandImage = (name: string) =>
  new URL(`../../brand/images/${name}`, import.meta.url).pathname
