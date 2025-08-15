// @vitest-environment happy-dom
// happy-dom: en jsdom (con Vitest 5) un File dentro de FormData rompe `new Request(...)`.
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { category, listing, mockApi, user } from '@/test/api'
import { renderApp } from '@/test/render'

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
  URL.createObjectURL ??= () => 'blob:preview'
  URL.revokeObjectURL ??= () => {}
})

describe('nueva publicación', () => {
  it('recorre los 4 pasos, crea la publicación y sube las fotos en orden', async () => {
    const requests = mockApi({
      'GET /api/me/': () => user(),
      'GET /api/categories/': () => [category()],
      'POST /api/listings/': () => listing({ id: 13 }),
      'POST /api/listings/13/images/': () => ({ id: 1, image: 'x', position: 0 }),
      'GET /api/listings/13/': () => listing({ id: 13 }),
      'GET /api/listings/13/events/': () => [],
    })
    const { router } = await renderApp('/publicaciones/nueva')

    await userEvent.click(await screen.findByRole('button', { name: 'Instrumentos musicales' }))

    // Paso 2: validación de los campos fijos y de los de la categoría.
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findAllByText('Este campo es obligatorio.')).toHaveLength(3) // nombre, estado, tipo
    await userEvent.type(screen.getByLabelText('Nombre del artículo'), 'Teclado MIDI')
    await userEvent.type(screen.getByLabelText('Descripción'), 'Todas las teclas funcionan.')
    await userEvent.selectOptions(screen.getByLabelText('Estado del artículo'), 'like_new')
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'keys')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    // Paso 3: al menos una foto.
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Sube al menos una foto.')).toBeInTheDocument()
    const photos = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ]
    await userEvent.upload(screen.getByLabelText('Añadir fotos'), photos)
    expect(screen.getByText('Portada')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    // Paso 4: términos obligatorios.
    await userEvent.type(await screen.findByLabelText('Ciudad'), 'Bogotá')
    await userEvent.type(screen.getByLabelText('Dirección de recogida'), 'Calle 85 # 12-40')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    expect(await screen.findByText('Debes aceptar los términos.')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Acepto los términos y condiciones de Trueke'))
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/publicaciones/13'))
    const create = requests.find((r) => r.method === 'POST' && r.url.endsWith('/api/listings/'))!
    expect(await create.json()).toEqual({
      category: 2,
      title: 'Teclado MIDI',
      description: 'Todas las teclas funcionan.',
      condition: 'like_new',
      attributes: { kind: 'keys' }, // la marca vacía (opcional) no se envía
      city: 'Bogotá',
      pickup_address: 'Calle 85 # 12-40',
      is_original: true,
      terms_accepted: true,
    })
    const uploads = requests.filter((r) => r.url.endsWith('/images/'))
    const sent = await Promise.all(uploads.map((r) => r.formData()))
    expect(sent.map((f) => [(f.get('image') as File).name, f.get('position')])).toEqual([
      ['a.jpg', '0'],
      ['b.png', '1'],
    ])
  })
})
