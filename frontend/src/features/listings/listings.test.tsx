import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, reply, user } from '@/test/api'
import { renderApp } from '@/test/render'

const stats = { in_review: 1, offered: 2, accepted: 0, pickup_sent: 0, completed: 0, cancelled: 0 }
const page = (results: unknown[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
})

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

describe('mis publicaciones', () => {
  it('lista con pestañas por estado y contadores', async () => {
    const requests = mockApi({
      'GET /api/me/': () => user(),
      'GET /api/listings/stats/': () => stats,
      'GET /api/listings/': (request) =>
        new URL(request.url).searchParams.get('status') === 'offered'
          ? page([
              listing({
                id: 1,
                title: 'Celular',
                status: 'offered',
                offer_amount: '650000.00',
                offer_currency: 'COP',
              }),
            ])
          : page([listing(), listing({ id: 1, title: 'Celular', status: 'offered' })]),
    })
    const { router } = await renderApp('/publicaciones')

    expect(await screen.findByRole('heading', { name: 'Mis publicaciones' })).toBeInTheDocument()
    expect(await screen.findByText('Teclado MIDI')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Todas\s*3/ })).toHaveAttribute('aria-current', 'page')

    await userEvent.click(screen.getByRole('link', { name: /Con oferta\s*2/ }))
    await waitFor(() => expect(router.state.location.search).toEqual({ estado: 'offered' }))
    await waitFor(() => expect(screen.queryByText('Teclado MIDI')).not.toBeInTheDocument())
    expect(screen.getByText('Celular')).toBeInTheDocument()
    expect(requests.some((r) => r.url.includes('status=offered'))).toBe(true)
  })

  it('sin publicaciones invita a crear la primera', async () => {
    mockApi({
      'GET /api/me/': () => user(),
      'GET /api/listings/stats/': () => ({ ...stats, in_review: 0, offered: 0 }),
      'GET /api/listings/': () => page([]),
    })
    await renderApp('/publicaciones')
    expect(await screen.findByRole('link', { name: 'Publica tu primer artículo' })).toHaveAttribute(
      'href',
      '/publicaciones/nueva',
    )
  })
})

function detailRoutes(
  me: object,
  item: object,
  extra: Record<string, (r: Request) => unknown> = {},
) {
  return mockApi({
    'GET /api/me/': () => me,
    'GET /api/categories/': () => [category()],
    'GET /api/listings/13/': () => item,
    'GET /api/listings/13/events/': () => [
      {
        id: 1,
        action: 'create',
        from_status: '',
        to_status: 'in_review',
        actor: { id: 7, name: 'Laura Gómez' },
        data: {},
        created_at: '2026-09-19T12:00:00Z',
      },
    ],
    ...extra,
  })
}

describe('detalle', () => {
  it('muestra los campos de la categoría con sus etiquetas y el historial', async () => {
    detailRoutes(user(), listing())
    await renderApp('/publicaciones/13')
    expect(await screen.findByRole('heading', { name: 'Teclado MIDI' })).toBeInTheDocument()
    expect(await screen.findByText('Teclado')).toBeInTheDocument() // valor "keys" con su etiqueta
    expect(screen.getByText('Arturia')).toBeInTheDocument()
    expect(await screen.findByText('Publicación creada')).toBeInTheDocument()
  })

  it('el vendedor acepta la oferta; sin perfil completo ve cómo completarlo', async () => {
    const offered = listing({
      status: 'offered',
      offer_amount: '380000.00',
      offer_currency: 'COP',
      available_actions: ['accept', 'reject', 'cancel'],
    })
    detailRoutes(user(), offered, {
      'POST /api/listings/13/accept/': () =>
        reply(409, {
          code: 'profile_incomplete',
          detail: 'Completa tu perfil para aceptar la oferta.',
        }),
    })
    await renderApp('/publicaciones/13')
    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar oferta' }))
    const dialog = screen.getByRole('dialog', { name: '¿Aceptas la oferta?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }))

    expect(await within(dialog).findByText(/Completa tu perfil para aceptar/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Completar mi perfil' })).toHaveAttribute(
      'href',
      '/cuenta',
    )
  })

  it('el operador hace una oferta: valida el monto y envía los datos', async () => {
    const operator = user({ id: 1, role: 'operator' })
    // El servidor recuerda la oferta: al volver a pedir la publicación ya viene con oferta.
    let current = listing({ available_actions: ['offer', 'cancel'] })
    const requests = detailRoutes(operator, current, {
      'GET /api/listings/13/': () => current,
      'POST /api/listings/13/offer/': () => {
        current = listing({
          status: 'offered',
          offer_amount: '450000.00',
          offer_currency: 'COP',
          available_actions: ['cancel'],
        })
        return current
      },
    })
    await renderApp('/publicaciones/13')
    await userEvent.click(await screen.findByRole('button', { name: 'Hacer oferta' }))
    const dialog = screen.getByRole('dialog', { name: 'Hacer una oferta' })

    await userEvent.type(within(dialog).getByLabelText('Monto (COP)'), '0')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar oferta' }))
    expect(
      await within(dialog).findByText('Escribe un monto válido, mayor que cero.'),
    ).toBeInTheDocument()

    await userEvent.clear(within(dialog).getByLabelText('Monto (COP)'))
    await userEvent.type(within(dialog).getByLabelText('Monto (COP)'), '450000')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar oferta' }))

    expect(await screen.findByText('Oferta enviada.')).toBeInTheDocument()
    const offer = requests.find((r) => r.url.endsWith('/offer/'))!
    expect(await offer.json()).toEqual({ amount: '450000', currency: 'COP' })
    expect(screen.getByText('Con oferta')).toBeInTheDocument()
  })

  it('una publicación ajena o inexistente da 404', async () => {
    mockApi({
      'GET /api/me/': () => user(),
      'GET /api/listings/99/': () => reply(404, { detail: 'No encontrado.' }),
    })
    await renderApp('/publicaciones/99')
    expect(await screen.findByText('Esta página no existe.')).toBeInTheDocument()
  })
})
