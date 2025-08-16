// @vitest-environment happy-dom
// happy-dom: el test del adjunto manda un File en FormData (en jsdom + Vitest 5 falla `new Request`).
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, message, mockApi, user } from '@/test/api'
import { renderApp } from '@/test/render'

const page = (results: unknown[], next: string | null = null) => ({ next, previous: null, results })

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

function routes(extra: Record<string, (r: Request) => unknown> = {}) {
  return mockApi({
    'GET /api/me/': () => user(),
    'GET /api/categories/': () => [category()],
    'GET /api/listings/13/': () => listing(),
    'GET /api/listings/13/events/': () => [],
    'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
    'POST /api/listings/13/messages/read/': () => ({ updated: 1 }),
    ...extra,
  })
}

async function openChat() {
  await renderApp('/publicaciones/13')
  return within(await screen.findByRole('region', { name: 'Chat con Trueke' }))
}

describe('chat de la publicación', () => {
  it('muestra los mensajes en orden y marca como leídos los del otro lado', async () => {
    const requests = routes({
      'GET /api/listings/13/messages/': () =>
        page([
          message({ id: 2, text: 'Te ofrecemos 380 mil' }),
          message({
            id: 1,
            from_platform: false,
            sender: { id: 7, name: 'Laura' },
            text: 'Hola',
            read_at: '2026-09-19T12:01:00Z',
          }),
        ]),
    })
    const chat = await openChat()
    const texts = (await chat.findAllByText(/Hola|380 mil/)).map((el) => el.textContent)
    expect(texts).toEqual(['Hola', 'Te ofrecemos 380 mil']) // del más viejo al más nuevo
    expect(chat.getByText('Leído')).toBeInTheDocument() // mi mensaje ya lo vio Trueke
    await waitFor(() =>
      expect(requests.filter((r) => r.url.endsWith('/messages/read/'))).toHaveLength(1),
    )
  })

  it('no marca leído si no hay nada nuevo del otro lado', async () => {
    const requests = routes({
      'GET /api/listings/13/messages/': () =>
        page([message({ from_platform: false, sender: { id: 7, name: 'Laura' } })]),
    })
    const chat = await openChat()
    await chat.findByText('Hola, ¿sigue disponible?')
    expect(requests.some((r) => r.url.endsWith('/messages/read/'))).toBe(false)
  })

  it('Enter envía el texto como JSON y limpia el campo', async () => {
    const requests = routes({
      'GET /api/listings/13/messages/': () => page([]),
      'POST /api/listings/13/messages/': () =>
        message({ id: 3, from_platform: false, text: 'Sí, sigue' }),
    })
    const chat = await openChat()
    const box = chat.getByLabelText('Escribe un mensaje…')
    await userEvent.type(box, 'Sí, sigue{Enter}')
    await waitFor(() => expect(box).toHaveValue(''))
    const sent = requests.find((r) => r.method === 'POST' && r.url.endsWith('/messages/'))!
    expect(sent.headers.get('Content-Type')).toBe('application/json')
    expect(await sent.json()).toEqual({ text: 'Sí, sigue' })
  })

  it('Shift+Enter hace salto de línea y no envía', async () => {
    const requests = routes({ 'GET /api/listings/13/messages/': () => page([]) })
    const chat = await openChat()
    await userEvent.type(
      chat.getByLabelText('Escribe un mensaje…'),
      'línea 1{Shift>}{Enter}{/Shift}línea 2',
    )
    expect(chat.getByLabelText('Escribe un mensaje…')).toHaveValue('línea 1\nlínea 2')
    expect(requests.some((r) => r.method === 'POST' && r.url.endsWith('/messages/'))).toBe(false)
  })

  it('envía un adjunto como multipart', async () => {
    const requests = routes({
      'GET /api/listings/13/messages/': () => page([]),
      'POST /api/listings/13/messages/': () =>
        message({ id: 4, attachment_kind: 'pdf', attachment_url: '/x' }),
    })
    const chat = await openChat()
    await userEvent.upload(
      chat.getByLabelText('Adjuntar archivo'),
      new File(['%PDF'], 'factura.pdf', { type: 'application/pdf' }),
    )
    expect(chat.getByText('factura.pdf')).toBeInTheDocument()
    await userEvent.click(chat.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(chat.queryByText('factura.pdf')).not.toBeInTheDocument())
    const sent = requests.find((r) => r.method === 'POST' && r.url.endsWith('/messages/'))!
    const form = await sent.formData()
    expect((form.get('attachment') as File).name).toBe('factura.pdf')
  })

  it('carga mensajes anteriores con el cursor', async () => {
    const requests = routes({
      'GET /api/listings/13/messages/': (request) =>
        new URL(request.url).searchParams.get('cursor') === 'abc'
          ? page([message({ id: 1, text: 'El primero' })])
          : page(
              [message({ id: 2, text: 'El último' })],
              'http://localhost/api/listings/13/messages/?cursor=abc',
            ),
    })
    const chat = await openChat()
    await userEvent.click(await chat.findByRole('button', { name: 'Ver mensajes anteriores' }))
    expect(await chat.findByText('El primero')).toBeInTheDocument()
    expect(chat.queryByRole('button', { name: 'Ver mensajes anteriores' })).not.toBeInTheDocument()
    expect(requests.some((r) => r.url.includes('cursor=abc'))).toBe(true)
  })

  it('el operador ve el chat con el vendedor y sus mensajes a la derecha', async () => {
    routes({
      'GET /api/me/': () => user({ id: 1, role: 'operator' }),
      'GET /api/listings/13/messages/': () => page([message()]),
    })
    await renderApp('/publicaciones/13')
    const chat = within(await screen.findByRole('region', { name: 'Chat con el vendedor' }))
    expect((await chat.findByText('Hola, ¿sigue disponible?')).closest('.self-end')).not.toBeNull()
  })
})
