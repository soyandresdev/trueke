import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, user } from '@/test/api'
import { renderApp } from '@/test/render'

const seller = user({ id: 7, first_name: 'Laura' })
const operator = user({ id: 1, role: 'operator' })

const summary = {
  paid_total: '850000.00',
  pending_total: '420000.00',
  paid_count: 1,
  in_progress: 2,
  currency: 'COP',
}

const paidListing = listing({
  id: 21,
  title: 'Lente 50 mm',
  status: 'paid',
  paid_amount: '850000.00',
  paid_at: '2026-09-15',
  payment_reference: 'TRF-77',
  has_payment_receipt: true,
})

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

function routes(me = seller, data = summary, results = [paidListing]) {
  return mockApi({
    'GET /api/me/': () => me,
    'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
    'GET /api/categories/': () => [category()],
    'GET /api/listings/stats/': () => ({}),
    'GET /api/listings/summary/': () => data,
    'GET /api/listings/': () => ({ count: results.length, next: null, previous: null, results }),
  })
}

describe('resumen del vendedor', () => {
  it('muestra lo ganado, lo que falta cobrar y lo que está en curso', async () => {
    routes()
    await renderApp('/publicaciones')

    expect(await screen.findByText('$ 850.000')).toBeInTheDocument()
    expect(screen.getByText('$ 420.000')).toBeInTheDocument()
    const inProgress = screen.getByText('En curso').closest('div')!
    expect(inProgress).toHaveTextContent('2')
  })

  it('no aparece si la persona no ha publicado nada', async () => {
    routes(seller, { ...summary, paid_count: 0, in_progress: 0 }, [])
    await renderApp('/publicaciones')

    await screen.findByText(/no has publicado/i)
    expect(screen.queryByText('Ganado')).not.toBeInTheDocument()
  })

  it('el operador no lo pide: no es suyo', async () => {
    const requests = routes(operator)
    await renderApp('/publicaciones')

    await screen.findByRole('table')
    expect(
      requests.filter((r) => new URL(r.url).pathname === '/api/listings/summary/'),
    ).toHaveLength(0)
  })

  it('lleva al historial de pagos, con comprobante', async () => {
    routes()
    const { router } = await renderApp('/publicaciones')

    await userEvent.click(await screen.findByRole('link', { name: 'Ver mi pago' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/pagos'))

    expect(await screen.findByRole('heading', { name: 'Mis pagos' })).toBeInTheDocument()
    expect(await screen.findByText(/TRF-77/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver comprobante' })).toBeInTheDocument()
  })
})
