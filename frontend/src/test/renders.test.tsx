/**
 * Conteo de renders en páginas clave (PLAN.md: "re-renders múltiples por useEffect" en el proyecto
 * anterior). Dos garantías:
 * - Una página cargada y quieta no se vuelve a pintar sola (sin efectos en bucle ni sondeos).
 * - Cargar e interactuar no pasa de un número de commits razonable. Los límites tienen margen:
 *   si un cambio los supera, hay que mirar por qué antes de subirlos.
 */
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { queryClient } from '@/lib/queryClient'
import { applyRealtimeEvent } from '@/realtime/events'
import { category, listing, message, mockApi, user } from '@/test/api'
import { renderAppProfiled } from '@/test/render'

const idle = () => act(() => new Promise((resolve) => setTimeout(resolve, 600)))
const page = (results: unknown[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
})

beforeEach(async () => {
  await act(() => i18n.changeLanguage('es'))
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

function api() {
  return mockApi({
    'GET /api/me/': () => user(),
    'GET /api/notifications/unseen-count/': () => ({ count: 2 }),
    'GET /api/categories/': () => [category()],
    'GET /api/listings/stats/': () => ({
      in_review: 1,
      offered: 1,
      accepted: 0,
      pickup_sent: 0,
      completed: 0,
      cancelled: 0,
    }),
    'GET /api/listings/': () =>
      page([listing(), listing({ id: 14, title: 'Guitarra', status: 'offered' })]),
    'GET /api/listings/13/': () => listing(),
    'GET /api/listings/13/events/': () => [],
    'GET /api/listings/13/messages/': () => ({ next: null, previous: null, results: [message()] }),
    'POST /api/listings/13/messages/read/': () => ({ updated: 1 }),
  })
}

describe('renders', () => {
  it('Mis publicaciones: carga en pocos commits y luego queda quieta', async () => {
    api()
    const app = await renderAppProfiled('/publicaciones')
    await screen.findByText('Guitarra')
    await idle()
    expect(app.commits()).toBeLessThanOrEqual(8) // medido: 5

    app.reset()
    await idle()
    expect(app.commits()).toBe(0)
  })

  it('cambiar de pestaña no repinta en cascada', async () => {
    api()
    const app = await renderAppProfiled('/publicaciones')
    await screen.findByText('Guitarra')
    await idle()
    app.reset()
    const tabs = within(screen.getByRole('navigation', { name: 'Filtrar por estado' }))
    await userEvent.click(tabs.getByRole('link', { name: /Con oferta/ }))
    await idle()
    expect(app.commits()).toBeLessThanOrEqual(8) // medido: 6
  })

  it('detalle con chat: queda quieto tras cargar y marcar leídos', async () => {
    api()
    const app = await renderAppProfiled('/publicaciones/13')
    await screen.findByText('Hola, ¿sigue disponible?')
    await idle()
    expect(app.commits()).toBeLessThanOrEqual(14) // medido: 10

    app.reset()
    await idle()
    expect(app.commits()).toBe(0)
  })

  it('escribir en el chat repinta una vez por tecla, no más', async () => {
    api()
    const app = await renderAppProfiled('/publicaciones/13')
    await screen.findByText('Hola, ¿sigue disponible?')
    await idle()
    app.reset()
    await userEvent.type(screen.getByLabelText('Escribe un mensaje…'), 'hola')
    expect(app.commits()).toBeLessThanOrEqual(4) // 4 teclas: una por tecla
  })

  it('un evento en vivo vuelve a pedir datos sin repintar en bucle', async () => {
    api()
    const app = await renderAppProfiled('/publicaciones/13')
    await screen.findByText('Hola, ¿sigue disponible?')
    await idle()
    app.reset()
    act(() =>
      applyRealtimeEvent(queryClient, {
        channel: 'listing.13',
        event: 'message.created',
        data: { listing: 13 },
      }),
    )
    await idle()
    // Mismos datos: TanStack Query comparte la estructura y no repinta (medido: 0).
    expect(app.commits()).toBeLessThanOrEqual(3)
    app.reset()
    await idle()
    expect(app.commits()).toBe(0)
  })
})
