// @vitest-environment happy-dom
// happy-dom: el comprobante va como File en FormData (en jsdom + Vitest 5 falla `new Request`).
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, user } from '@/test/api'
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

const completed = listing({
  status: 'completed',
  offer_amount: '380000.00',
  offer_currency: 'COP',
  available_actions: ['pay'],
})
const paid = listing({
  status: 'paid',
  offer_amount: '380000.00',
  offer_currency: 'COP',
  paid_amount: '380000.00',
  paid_at: '2026-09-25',
  payment_reference: 'TRF-001',
  has_payment_receipt: true,
  available_actions: [],
})

describe('registrar el pago', () => {
  it('el operador registra el pago con comprobante (multipart) y monto sugerido', async () => {
    let current: object = completed
    const requests = routes(user({ id: 1, role: 'operator' }), () => current, {
      'POST /api/listings/13/pay/': () => {
        current = paid
        return paid
      },
    })
    await renderApp('/publicaciones/13')
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar el pago' })
    expect(within(dialog).getByLabelText('Monto pagado (COP)')).toHaveValue('380000')

    await userEvent.type(within(dialog).getByLabelText('Referencia de la transferencia'), 'TRF-001')
    await userEvent.upload(
      within(dialog).getByLabelText('Comprobante'),
      new File(['%PDF'], 'transferencia.pdf', { type: 'application/pdf' }),
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar pago' }))

    expect(await screen.findByText('Pago registrado.')).toBeInTheDocument()
    const sent = await requests.find((r) => r.url.endsWith('/pay/'))!.formData()
    expect([sent.get('amount'), sent.get('reference'), (sent.get('receipt') as File).name]).toEqual(
      ['380000', 'TRF-001', 'transferencia.pdf'],
    )
    expect(sent.has('paid_at')).toBe(false) // vacía: el backend pone la de hoy
  })

  it('el vendedor ve el pago, la referencia y el comprobante', async () => {
    routes(user(), () => paid)
    await renderApp('/publicaciones/13')
    expect(await screen.findByText(/Te pagamos \$\s?380\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Referencia: TRF-001/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver comprobante' })).toBeInTheDocument()
    expect(screen.getByText('Pagada', { exact: true })).toBeInTheDocument()
    await waitFor(() =>
      console.log(
        'DBG',
        screen.getAllByRole('figure').map((f) => f.textContent),
      ),
    )
  })
})
