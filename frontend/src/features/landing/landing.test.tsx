import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { category, mockApi, reply } from '@/test/api'
import { renderApp } from '@/test/render'

beforeEach(async () => {
  await act(() => i18n.changeLanguage('es'))
})

describe('landing', () => {
  it('muestra las secciones y las categorías de la API', async () => {
    mockApi({ 'GET /api/categories/': () => [category()] })
    await renderApp('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Lo que ya no usas vale más',
    )
    expect(screen.getByRole('heading', { name: 'Vender es así de simple' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Instrumentos musicales' })).toHaveAttribute(
      'href',
      '/publicaciones/nueva',
    )
    expect(screen.getByRole('link', { name: 'Vender algo' })).toHaveAttribute(
      'href',
      '/publicaciones/nueva',
    )
  })

  it('las preguntas frecuentes se abren', async () => {
    mockApi({ 'GET /api/categories/': () => [] })
    await renderApp('/')
    const question = screen.getByText('¿Cómo me pagan?')
    const details = question.closest('details')!
    expect(details.open).toBe(false)
    await userEvent.click(question)
    expect(details.open).toBe(true)
  })

  it('newsletter: valida el email y se suscribe', async () => {
    const requests = mockApi({
      'GET /api/categories/': () => [],
      'POST /api/newsletter/subscribe/': () => reply(202),
    })
    await renderApp('/')
    const input = screen.getByPlaceholderText('tu@email.com')
    await userEvent.type(input, 'no-es-email')
    await userEvent.click(screen.getByRole('button', { name: 'Suscribirme' }))
    expect(await screen.findByText('Escribe un email válido.')).toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, 'ana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Suscribirme' }))
    expect(await screen.findByText(/Te escribiremos solo cuando valga la pena/)).toBeInTheDocument()
    const sent = requests.find((r) => r.url.endsWith('/newsletter/subscribe/'))!
    expect(await sent.json()).toEqual({ email: 'ana@example.com' })
  })
})

describe('baja del newsletter', () => {
  const token = '0d3c8a4e-5b7f-4c21-9d3e-2f1a6b8c9e70'

  it('pide confirmar antes de dar de baja', async () => {
    const requests = mockApi({ 'POST /api/newsletter/unsubscribe/': () => reply(204) })
    await renderApp(`/newsletter/baja?token=${token}`)
    expect(requests).toHaveLength(0) // abrir el enlace no da de baja
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar baja' }))
    expect(await screen.findByText('Listo, ya no te escribiremos.')).toBeInTheDocument()
    expect(await requests[0]!.json()).toEqual({ token })
  })

  it('con un enlace roto lo explica', async () => {
    mockApi({})
    await renderApp('/newsletter/baja?token=abc')
    expect(screen.getByText(/Este enlace no es válido/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar baja' })).not.toBeInTheDocument()
  })
})

describe('términos', () => {
  it('se muestran en el idioma actual', async () => {
    mockApi({})
    await renderApp('/terminos')
    expect(screen.getByRole('heading', { name: 'Términos de uso' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Qué es Trueke' })).toBeInTheDocument()
    await act(() => i18n.changeLanguage('en'))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'What Trueke is' })).toBeInTheDocument(),
    )
  })
})

describe('idioma', () => {
  it('al cambiar de idioma vuelve a pedir las categorías (el backend las traduce)', async () => {
    const requests = mockApi({
      'GET /api/categories/': (request) => [
        category({
          name:
            request.headers.get('Accept-Language') === 'en'
              ? 'Musical instruments'
              : 'Instrumentos musicales',
        }),
      ],
    })
    await renderApp('/')
    expect(await screen.findByRole('link', { name: 'Instrumentos musicales' })).toBeInTheDocument()
    await act(() => i18n.changeLanguage('en'))
    expect(await screen.findByRole('link', { name: 'Musical instruments' })).toBeInTheDocument()
    expect(requests.map((r) => r.headers.get('Accept-Language'))).toEqual(['es', 'en'])
  })
})
