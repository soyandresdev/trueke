import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, mockApi, user } from '@/test/api'
import { renderApp } from '@/test/render'

const operator = user({ id: 1, role: 'operator', first_name: 'Sara' })
const seller = user({ id: 7, role: 'seller' })

const dashboard = {
  days: 30,
  queue: {
    unoffered: 3,
    countered: 1,
    pickups_today: 0,
    unpaid: 2,
    oldest_waiting_days: 5,
  },
  funnel: { created: 10, offered: 8, accepted: 6, picked_up: 4, completed: 3, paid: 2 },
  period: {
    created: 10,
    offered: 8,
    accepted: 6,
    acceptance_rate: 0.75,
    paid_count: 2,
    paid_total: '1500000.00',
    average_paid: '750000.00',
    offered_total: '4000000.00',
    hours_to_offer: 5.4,
  },
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 13,
  title: 'Teclado MIDI',
  seller: { id: 7, name: 'Laura Gómez' },
  category: 'Instrumentos musicales',
  city: 'Bogotá',
  status: 'offered',
  offer_amount: '450000.00',
  counter_amount: null,
  paid_amount: null,
  offer_currency: 'COP',
  payment_reference: '',
  created_at: '2026-09-10T12:00:00Z',
  offered_at: '2026-09-11T12:00:00Z',
  accepted_at: null,
  paid_at: null,
  ...overrides,
})

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

function panelRoutes(me = operator, rows = [row()]) {
  return mockApi({
    'GET /api/me/': () => me,
    'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
    'GET /api/categories/': () => [category()],
    'GET /api/listings/dashboard/': () => dashboard,
    'GET /api/listings/stats/': () => ({}),
    'GET /api/listings/': () => ({ count: 0, next: null, previous: null, results: [] }),
    'GET /api/listings/offers/': () => ({
      count: rows.length,
      next: null,
      previous: null,
      results: rows,
    }),
  })
}

const offerParams = (requests: Request[]) =>
  requests
    .filter((r) => new URL(r.url).pathname === '/api/listings/offers/')
    .map((r) => new URL(r.url).searchParams)

describe('panel del operador', () => {
  it('muestra las colas, el embudo y los números', async () => {
    panelRoutes()
    await renderApp('/panel')

    const queue = await screen.findByRole('link', { name: /Esperan oferta/ })
    expect(within(queue).getByText('3')).toBeInTheDocument()
    expect(within(queue).getByText('La más vieja lleva 5 días')).toBeInTheDocument()
    // Una cola vacía lo dice en vez de dejar el número solo.
    const pickups = screen.getByRole('link', { name: /Recogidas pendientes/ })
    expect(within(pickups).getByText('Nada pendiente')).toBeInTheDocument()

    expect(screen.getByText('Embudo')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument() // ofertas aceptadas
    expect(screen.getByText('5 horas')).toBeInTheDocument()
  })

  it('el vendedor no entra al panel', async () => {
    panelRoutes(seller)
    const { router } = await renderApp('/panel')

    await waitFor(() => expect(router.state.location.pathname).toBe('/publicaciones'))
  })

  it('la tabla de ofertas muestra el dinero y las fechas', async () => {
    panelRoutes(operator, [row({ counter_amount: '500000.00', paid_amount: '500000.00' })])
    await renderApp('/panel')

    const table = await screen.findByRole('table')
    const line = within(table).getByRole('link', { name: 'Teclado MIDI' }).closest('tr')!
    expect(within(line).getByText(/Laura Gómez/)).toBeInTheDocument()
    expect(within(line).getByText('$ 450.000')).toBeInTheDocument()
    expect(within(line).getByText(/Contra:/)).toBeInTheDocument()
  })

  it('ordenar por una columna queda en la URL y se pide al servidor', async () => {
    const requests = panelRoutes()
    const { router } = await renderApp('/panel')
    const table = await screen.findByRole('table')
    // "Oferta" y "Ofertada" son dos columnas: se busca el encabezado exacto.
    const byOffer = within(table).getByRole('button', { name: 'Oferta' })

    await userEvent.click(byOffer)

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ orden: '-offer_amount' }),
    )
    await waitFor(() => expect(offerParams(requests).at(-1)?.get('ordering')).toBe('-offer_amount'))

    // Al repetir la columna se invierte el sentido.
    await userEvent.click(within(table).getByRole('button', { name: 'Oferta' }))
    await waitFor(() => expect(offerParams(requests).at(-1)?.get('ordering')).toBe('offer_amount'))
  })

  it('una cola filtra la tabla y se puede quitar', async () => {
    const requests = panelRoutes()
    const { router } = await renderApp('/panel?cola=unpaid')
    await screen.findByRole('table')

    await waitFor(() => expect(offerParams(requests).at(-1)?.get('queue')).toBe('unpaid'))

    await userEvent.click(screen.getByRole('button', { name: 'Ver todas' }))
    await waitFor(() => expect(router.state.location.search).not.toMatchObject({ cola: 'unpaid' }))
  })
})
