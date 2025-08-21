import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, reply, user } from '@/test/api'
import { renderApp } from '@/test/render'

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

function routes(
  me: object,
  current: () => object,
  extra: Record<string, (r: Request) => unknown> = {},
) {
  return mockApi({
    'GET /api/me/': () => me,
    'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
    'GET /api/categories/': () => [category()],
    'GET /api/listings/13/': current,
    'GET /api/listings/13/events/': () => [],
    'GET /api/listings/13/messages/': () => ({ next: null, previous: null, results: [] }),
    'GET /api/users/7/': () => user(),
    ...extra,
  })
}

const offered = listing({
  status: 'offered',
  offer_amount: '380000.00',
  offer_currency: 'COP',
  counters_left: 2,
  available_actions: ['accept', 'counter', 'reject', 'cancel'],
})
const countered = listing({
  status: 'countered',
  offer_amount: '380000.00',
  offer_currency: 'COP',
  counter_amount: '420000.00',
  counters_left: 1,
  available_actions: ['offer', 'accept_counter', 'cancel'],
})

describe('contraoferta', () => {
  it('la vendedora pide otro monto y ve lo que pidió', async () => {
    let current: object = offered
    const requests = routes(user(), () => current, {
      'POST /api/listings/13/counter/': () => {
        current = { ...countered, available_actions: ['cancel'] }
        return current
      },
    })
    await renderApp('/publicaciones/13')
    await userEvent.click(await screen.findByRole('button', { name: 'Contraofertar' }))
    const dialog = screen.getByRole('dialog', { name: 'Hacer una contraoferta' })
    expect(within(dialog).getByText(/Te ofrecimos \$\s?380\.000/)).toBeInTheDocument()
    expect(within(dialog).getByText('Te quedan 2 contraofertas.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Tu precio (COP)'), '420000')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar contraoferta' }))

    expect(await screen.findByText('Contraoferta enviada.')).toBeInTheDocument()
    expect(await requests.find((r) => r.url.endsWith('/counter/'))!.json()).toEqual({
      amount: '420000',
    })
    expect(screen.getByText(/Pediste \$\s?420\.000/)).toBeInTheDocument()
  })

  it('el operador ve lo que pide el vendedor y acepta la contraoferta', async () => {
    const requests = routes(user({ id: 1, role: 'operator' }), () => countered, {
      'POST /api/listings/13/accept-counter/': () =>
        listing({ status: 'accepted', offer_amount: '420000.00' }),
    })
    await renderApp('/publicaciones/13')
    expect(await screen.findByText(/El vendedor pide \$\s?420\.000/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hacer oferta' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Aceptar contraoferta' }))
    const dialog = screen.getByRole('dialog', { name: '¿Aceptas la contraoferta?' })
    expect(within(dialog).getByRole('figure')).toHaveTextContent('420.000')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }))
    expect(await screen.findByText('Contraoferta aceptada.')).toBeInTheDocument()
    expect(requests.some((r) => r.url.endsWith('/accept-counter/'))).toBe(true)
  })

  it('sin rondas, el error del servidor se muestra en el modal', async () => {
    routes(user(), () => offered, {
      'POST /api/listings/13/counter/': () =>
        reply(409, {
          code: 'counter_limit',
          detail: 'Ya no puedes hacer más contraofertas en esta publicación.',
        }),
    })
    await renderApp('/publicaciones/13')
    await userEvent.click(await screen.findByRole('button', { name: 'Contraofertar' }))
    const dialog = screen.getByRole('dialog', { name: 'Hacer una contraoferta' })
    await userEvent.type(within(dialog).getByLabelText('Tu precio (COP)'), '420000')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar contraoferta' }))
    expect(
      await within(dialog).findByText(/Ya no puedes hacer más contraofertas/),
    ).toBeInTheDocument()
  })
})
