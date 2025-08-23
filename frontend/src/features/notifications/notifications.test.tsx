import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, notification, user } from '@/test/api'
import { renderApp } from '@/test/render'

import { notificationText } from './text'

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

describe('texto de las notificaciones', () => {
  it('arma el texto según el tipo, en el idioma actual', async () => {
    expect(notificationText(notification() as never)).toMatch(
      /^Tienes una oferta por «Teclado MIDI»: \$\s?380\.000\.$/,
    )
    const messages = notification({ kind: 'message.new', data: { count: 3 } })
    expect(notificationText(messages as never)).toBe(
      '3 mensajes nuevos de Sara Operadora en «Teclado MIDI».',
    )
    await i18n.changeLanguage('en')
    expect(notificationText(notification({ kind: 'listing.cancel' }) as never)).toBe(
      '“Teclado MIDI” was cancelled.',
    )
  })

  it('los recordatorios de la plataforma dicen el tiempo que queda', async () => {
    const reminder = notification({
      kind: 'listing.review_reminder',
      data: { hours: 48 },
    })
    expect(notificationText(reminder as never)).toBe(
      '«Teclado MIDI» lleva 48 horas esperando una oferta.',
    )

    const pending = (days: number) =>
      notificationText(
        notification({ kind: 'listing.offer_reminder', data: { days_left: days } }) as never,
      )
    expect(pending(3)).toBe('Todavía tienes una oferta por «Teclado MIDI». Vence en 3 días.')
    expect(pending(1)).toBe('Todavía tienes una oferta por «Teclado MIDI». Vence mañana.')
    expect(pending(0)).toBe('Todavía tienes una oferta por «Teclado MIDI». Vence hoy.')

    expect(notificationText(notification({ kind: 'listing.expire' }) as never)).toBe(
      'La oferta por «Teclado MIDI» venció. Vuelve a revisión.',
    )
  })
})

describe('campana', () => {
  function routes(count: number) {
    return mockApi({
      'GET /api/me/': () => user(),
      'GET /api/notifications/unseen-count/': () => ({ count }),
      'GET /api/notifications/': () =>
        page([
          notification({ id: 2 }),
          notification({ id: 1, kind: 'listing.create', seen_at: '2026-09-19T12:00:00Z' }),
        ]),
      'POST /api/notifications/2/seen/': () => ({ updated: 1 }),
      'POST /api/notifications/seen-all/': () => ({ updated: 1 }),
      'GET /api/categories/': () => [category()],
      'GET /api/listings/13/': () => listing(),
      'GET /api/listings/13/events/': () => [],
      'GET /api/listings/13/messages/': () => ({ next: null, previous: null, results: [] }),
    })
  }

  it('muestra el contador y la lista solo al abrirla', async () => {
    const requests = routes(1)
    await renderApp('/')
    const bell = await screen.findByRole('button', { name: 'Notificaciones: 1 sin ver' })
    expect(requests.some((r) => new URL(r.url).pathname === '/api/notifications/')).toBe(false)

    await userEvent.click(bell)
    expect(await screen.findByText(/Tienes una oferta por «Teclado MIDI»/)).toBeInTheDocument()
    expect(screen.getByText('Sara Operadora publicó «Teclado MIDI».')).toBeInTheDocument()
  })

  it('al hacer clic en una notificación la marca vista y abre la publicación', async () => {
    const requests = routes(1)
    const { router } = await renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Notificaciones: 1 sin ver' }))
    await userEvent.click(await screen.findByText(/Tienes una oferta/))
    await waitFor(() => expect(router.state.location.pathname).toBe('/publicaciones/13'))
    expect(requests.some((r) => r.url.endsWith('/notifications/2/seen/'))).toBe(true)
  })

  it('marca todas como vistas', async () => {
    const requests = routes(1)
    await renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Notificaciones: 1 sin ver' }))
    const panel = (await screen.findByText('Notificaciones')).closest('[popover]') as HTMLElement
    await userEvent.click(within(panel).getByRole('button', { name: 'Marcar todas como vistas' }))
    await waitFor(() => expect(requests.some((r) => r.url.endsWith('/seen-all/'))).toBe(true))
  })

  it('sin sesión no hay campana', async () => {
    act(() => useAuth.getState().logout())
    mockApi({})
    await renderApp('/')
    expect(screen.queryByRole('button', { name: /Notificaciones/ })).not.toBeInTheDocument()
  })
})
