// @vitest-environment happy-dom
// happy-dom: subir fotos manda un File en FormData (en jsdom + Vitest 5 falla `new Request`).
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, reply, user } from '@/test/api'
import { renderApp } from '@/test/render'

const twoPhotos = [
  { id: 1, image: 'http://localhost/media/1.jpg', position: 0 },
  { id: 2, image: 'http://localhost/media/2.jpg', position: 1 },
]

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

function routes(
  current: Record<string, unknown>,
  extra: Record<string, (r: Request) => unknown> = {},
) {
  return mockApi({
    'GET /api/me/': () => user(),
    'GET /api/notifications/unseen-count/': () => ({ count: 0 }),
    'GET /api/categories/': () => [category()],
    'GET /api/listings/13/': () => current,
    'GET /api/listings/13/events/': () => [],
    'GET /api/listings/13/messages/': () => ({ next: null, previous: null, results: [] }),
    ...extra,
  })
}

describe('editar publicación', () => {
  it('el vendedor ve "Editar" en revisión y guarda los cambios', async () => {
    let current = listing({ images: twoPhotos })
    const requests = routes(current, {
      'GET /api/listings/13/': () => current,
      'PATCH /api/listings/13/': async (request) => {
        current = { ...current, ...((await request.json()) as object) }
        return current
      },
    })
    const { router } = await renderApp('/publicaciones/13')
    await userEvent.click(await screen.findByRole('link', { name: 'Editar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/publicaciones/13/editar'))

    // El formulario llega relleno con lo guardado, incluidos los campos de la categoría.
    const title = await screen.findByLabelText('Nombre del artículo')
    expect(title).toHaveValue('Teclado MIDI')
    expect(screen.getByLabelText('Tipo')).toHaveValue('keys')
    expect(screen.getByLabelText('Marca (opcional)')).toHaveValue('Arturia')

    await userEvent.clear(title)
    await userEvent.type(title, 'Teclado MIDI Arturia KeyLab')
    await userEvent.clear(screen.getByLabelText('Marca (opcional)'))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/publicaciones/13'))
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    const patch = requests.find((r) => r.method === 'PATCH')!
    expect(await patch.json()).toMatchObject({
      title: 'Teclado MIDI Arturia KeyLab',
      attributes: { kind: 'keys' }, // la marca vacía se quita
      city: 'Bogotá',
      is_original: true,
    })
  })

  it('las fotos se quitan y se añaden al momento, sin quedarse sin ninguna', async () => {
    let images = [...twoPhotos]
    const requests = routes(listing(), {
      'GET /api/listings/13/': () => listing({ images }),
      'DELETE /api/listings/13/images/2/': () => {
        images = images.filter((image) => image.id !== 2)
        return reply(204)
      },
      'POST /api/listings/13/images/': () => {
        images = [...images, { id: 3, image: 'http://localhost/media/3.jpg', position: 1 }]
        return images.at(-1)
      },
    })
    await renderApp('/publicaciones/13/editar')

    await userEvent.click(await screen.findByRole('button', { name: 'Quitar la foto 2' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Quitar la foto/ })).not.toBeInTheDocument(),
    )
    // Con una sola foto no hay botón para quitarla.
    expect(screen.getAllByRole('img', { name: /Foto/ })).toHaveLength(1)

    await userEvent.upload(
      screen.getByLabelText('Añadir fotos'),
      new File(['x'], 'nueva.jpg', { type: 'image/jpeg' }),
    )
    await waitFor(() => expect(screen.getAllByRole('img', { name: /Foto/ })).toHaveLength(2))
    const upload = requests.find((r) => r.method === 'POST' && r.url.endsWith('/images/'))!
    expect((await upload.formData()).get('position')).toBe('1')
  })

  it('fuera de revisión no se puede editar', async () => {
    routes(listing({ status: 'offered', available_actions: ['accept', 'reject', 'cancel'] }))
    await renderApp('/publicaciones/13')
    await screen.findByRole('heading', { name: 'Teclado MIDI' })
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('entrando directo a /editar de algo que no se puede editar, lo explica', async () => {
    routes(listing({ status: 'offered' }))
    await renderApp('/publicaciones/13/editar')
    expect(await screen.findByText(/solo se edita mientras está en revisión/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('muestra los errores del servidor en su campo', async () => {
    routes(listing({ images: twoPhotos }), {
      'PATCH /api/listings/13/': () =>
        reply(400, { title: ['Ya tienes una publicación con ese nombre.'] }),
    })
    await renderApp('/publicaciones/13/editar')
    const title = await screen.findByLabelText('Nombre del artículo')
    await userEvent.type(title, ' 2')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    const form = title.closest('form')!
    expect(
      await within(form).findByText('Ya tienes una publicación con ese nombre.'),
    ).toBeInTheDocument()
  })
})
