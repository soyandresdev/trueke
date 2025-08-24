import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, user } from '@/test/api'
import { renderApp } from '@/test/render'

const operator = user({ id: 1, role: 'operator', first_name: 'Sara', last_name: 'Operadora' })
const seller = user({ id: 7, first_name: 'Laura', last_name: 'Gómez' })

const note = {
  id: 3,
  text: 'Llamé al vendedor, no contestó.',
  author: { id: 1, name: 'Sara Operadora' },
  created_at: '2026-09-18T15:00:00Z',
}

function routes(me = operator, current = listing({ assigned_to: null }), notes = [note]) {
  let state = current
  const requests = mockApi({
    'GET /api/me/': () => me,
    'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
    'GET /api/categories/': () => [category()],
    'GET /api/users/7/': () => seller,
    'GET /api/listings/13/': () => state,
    'GET /api/listings/13/events/': () => [],
    'GET /api/listings/13/messages/': () => ({ next: null, previous: null, results: [] }),
    'GET /api/listings/13/notes/': () => notes,
    'POST /api/listings/13/notes/': async (request) => {
      const body = (await request.json()) as { text: string }
      notes = [{ ...note, id: 4, text: body.text }, ...notes]
      return notes[0]
    },
    'POST /api/listings/13/assign/': async (request) => {
      const body = (await request.json()) as { operator: number | null }
      state = { ...state, assigned_to: body.operator ? { id: 1, name: 'Sara Operadora' } : null }
      return state
    },
  })
  return requests
}

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

const teamCard = async () =>
  (await screen.findByRole('heading', { name: /Equipo/ })).closest('section')!

describe('trastienda del equipo', () => {
  it('el operador toma el caso y luego lo suelta', async () => {
    const requests = routes()
    await renderApp('/publicaciones/13')
    const card = await teamCard()
    expect(within(card).getByText('Nadie todavía')).toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Tomar este caso' }))
    expect(await within(card).findByText('Tú')).toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Soltarlo' }))
    await waitFor(() => expect(within(card).getByText('Nadie todavía')).toBeInTheDocument())

    const bodies = await Promise.all(
      requests
        .filter((r) => new URL(r.url).pathname === '/api/listings/13/assign/')
        .map((r) => r.json()),
    )
    expect(bodies).toEqual([{ operator: 1 }, { operator: null }])
  })

  it('escribe una nota y aparece en la lista', async () => {
    routes()
    await renderApp('/publicaciones/13')
    const card = await teamCard()
    expect(await within(card).findByText(/no contestó/)).toBeInTheDocument()

    await userEvent.type(within(card).getByLabelText('Nota interna'), 'Recoge el jueves')
    await userEvent.click(within(card).getByRole('button', { name: 'Guardar nota' }))

    expect(await within(card).findByText('Recoge el jueves')).toBeInTheDocument()
  })

  it('el vendedor no ve nada de esto', async () => {
    const requests = routes(seller)
    await renderApp('/publicaciones/13')

    await screen.findByRole('heading', { name: /Historial/ })
    expect(screen.queryByRole('heading', { name: /Equipo/ })).not.toBeInTheDocument()
    expect(requests.some((r) => new URL(r.url).pathname.endsWith('/notes/'))).toBe(false)
  })
})
