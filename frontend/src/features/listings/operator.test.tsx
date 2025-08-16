import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, user } from '@/test/api'
import { renderApp } from '@/test/render'

const operator = user({ id: 1, role: 'operator', first_name: 'Sara' })
const stats = { in_review: 25, offered: 0, accepted: 0, pickup_sent: 0, completed: 0, cancelled: 0 }

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

function listRoutes() {
  return mockApi({
    'GET /api/me/': () => operator,
    'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
    'GET /api/categories/': () => [category()],
    'GET /api/listings/stats/': () => stats,
    'GET /api/listings/': (request) => {
      const params = new URL(request.url).searchParams
      const title = params.get('q') ? `Resultado de ${params.get('q')}` : 'Teclado MIDI'
      return {
        count: 25,
        next: null,
        previous: null,
        results: [listing({ title, seller: { id: 7, name: 'Laura Gómez' } })],
      }
    },
  })
}

const listRequests = (requests: Request[]) =>
  requests
    .filter((r) => new URL(r.url).pathname === '/api/listings/')
    .map((r) => new URL(r.url).searchParams)

describe('panel del operador', () => {
  it('muestra la tabla con vendedor y categoría', async () => {
    listRoutes()
    await renderApp('/publicaciones')
    const table = await screen.findByRole('table')
    const row = within(table).getByRole('link', { name: 'Teclado MIDI' }).closest('tr')!
    expect(within(row).getByText('Laura Gómez')).toBeInTheDocument()
    expect(await within(row).findByText('Instrumentos musicales')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Nueva publicación/ })).not.toBeInTheDocument()
  })

  it('la búsqueda espera a que termines de escribir y queda en la URL', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const requests = listRoutes()
    const { router } = await renderApp('/publicaciones')
    await screen.findByRole('table')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'guitarra')
    expect(listRequests(requests).some((p) => p.get('q'))).toBe(false) // todavía no
    await act(() => vi.advanceTimersByTimeAsync(400))

    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: 'guitarra' }))
    expect(await screen.findAllByText('Resultado de guitarra')).not.toHaveLength(0)
    expect(listRequests(requests).filter((p) => p.get('q'))).toHaveLength(1) // una sola petición, no una por letra
    vi.useRealTimers()
  })

  it('filtra por categoría y ciudad, y las pestañas conservan los filtros', async () => {
    const requests = listRoutes()
    const { router } = await renderApp('/publicaciones?ciudad=Cali')
    await screen.findByRole('table')
    expect(screen.getByRole('searchbox', { name: 'Ciudad' })).toHaveValue('Cali')
    await screen.findByRole('option', { name: 'Instrumentos musicales' })

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Categoría' }),
      'instrumentos',
    )
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        ciudad: 'Cali',
        categoria: 'instrumentos',
      }),
    )

    const tabs = within(screen.getByRole('navigation', { name: 'Filtrar por estado' }))
    await userEvent.click(tabs.getByRole('link', { name: /En revisión/ }))
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        ciudad: 'Cali',
        categoria: 'instrumentos',
        estado: 'in_review',
      }),
    )
    const last = listRequests(requests).at(-1)!
    expect([last.get('city'), last.get('category'), last.get('status')]).toEqual([
      'Cali',
      'instrumentos',
      'in_review',
    ])
  })

  it('pagina los resultados y un filtro nuevo vuelve a la primera página', async () => {
    const requests = listRoutes()
    const { router } = await renderApp('/publicaciones')
    await screen.findByRole('option', { name: 'Instrumentos musicales' })
    await userEvent.click(await screen.findByRole('button', { name: /Siguiente/ }))
    await waitFor(() => expect(router.state.location.search).toEqual({ pagina: 2 }))
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    expect(listRequests(requests).at(-1)!.get('page')).toBe('2')

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Categoría' }),
      'instrumentos',
    )
    await waitFor(() => expect(router.state.location.search).toEqual({ categoria: 'instrumentos' }))
  })
})

describe('ficha del vendedor', () => {
  function detail(seller: object) {
    return mockApi({
      'GET /api/me/': () => operator,
      'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
      'GET /api/categories/': () => [category()],
      'GET /api/listings/13/': () => listing({ available_actions: ['offer', 'cancel'] }),
      'GET /api/listings/13/events/': () => [],
      'GET /api/listings/13/messages/': () => ({ next: null, previous: null, results: [] }),
      'GET /api/users/7/': () => seller,
    })
  }

  it('el operador ve contacto, datos de pago y documentos', async () => {
    detail(
      user({
        first_name: 'Laura',
        last_name: 'Gómez',
        email: 'laura@example.com',
        document_type: 'national_id',
        document_number: '1020304050',
        has_document_file: true,
        profile_complete: false,
      }),
    )
    await renderApp('/publicaciones/13')
    const card = within(await screen.findByRole('region', { name: 'Laura Gómez' }))
    expect(card.getByRole('link', { name: '+573001112233' })).toHaveAttribute(
      'href',
      'tel:+573001112233',
    )
    expect(card.getByText('1020304050')).toBeInTheDocument()
    expect(card.getByText(/Perfil incompleto/)).toBeInTheDocument()
    expect(card.getByRole('button', { name: 'Documento de identidad' })).toBeInTheDocument()
    expect(card.getByText('Falta: Certificado bancario')).toBeInTheDocument()
  })

  it('el vendedor no ve su propia ficha', async () => {
    const requests = mockApi({
      'GET /api/me/': () => user(),
      'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
      'GET /api/categories/': () => [category()],
      'GET /api/listings/13/': () => listing(),
      'GET /api/listings/13/events/': () => [],
      'GET /api/listings/13/messages/': () => ({ next: null, previous: null, results: [] }),
    })
    await renderApp('/publicaciones/13')
    await screen.findByRole('heading', { name: 'Teclado MIDI' })
    expect(requests.some((r) => r.url.includes('/api/users/'))).toBe(false)
  })
})
