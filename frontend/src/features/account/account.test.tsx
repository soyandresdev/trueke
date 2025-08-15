import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { mockApi, reply, user } from '@/test/api'
import { renderApp } from '@/test/render'

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

async function openAccount(me = user()) {
  const requests = mockApi({
    'GET /api/me/': () => me,
    'PATCH /api/me/': async (request) => ({ ...me, ...((await request.json()) as object) }),
    'PATCH /api/me/documents/': () => ({ ...me, has_document_file: true }),
  })
  const app = await renderApp('/cuenta')
  await screen.findByRole('heading', { name: 'Mi cuenta' })
  return { requests, ...app }
}

describe('mi cuenta', () => {
  it('avisa si falta completar el perfil', async () => {
    await openAccount()
    expect(screen.getByText('Completa tu perfil para vender')).toBeInTheDocument()
  })

  it('guarda los datos personales', async () => {
    const { requests } = await openAccount()
    await userEvent.type(screen.getByLabelText('Nombre'), 'Laura')
    await userEvent.type(screen.getByLabelText('Apellido'), 'Gómez')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Datos guardados.')).toBeInTheDocument()
    const patch = requests.find((r) => r.method === 'PATCH')!
    expect(await patch.json()).toMatchObject({ first_name: 'Laura', last_name: 'Gómez' })
  })

  it('exige nombre y apellido y valida el email', async () => {
    const { requests } = await openAccount(user({ first_name: 'Ana' }))
    await userEvent.clear(screen.getByLabelText('Nombre'))
    await userEvent.type(screen.getByLabelText('Email'), 'no-es-email')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findAllByText('Este campo es obligatorio.')).toHaveLength(2)
    expect(screen.getByText('Escribe un email válido.')).toBeInTheDocument()
    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(0)
  })

  it('muestra los errores del servidor en su campo', async () => {
    await openAccount(user({ first_name: 'Ana', last_name: 'Ruiz' }))
    mockApi({
      'GET /api/me/': () => user({ first_name: 'Ana', last_name: 'Ruiz' }),
      'PATCH /api/me/': () => reply(400, { document_number: ['Demasiado largo.'] }),
    })
    await userEvent.type(screen.getByLabelText('Número de documento'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Demasiado largo.')).toBeInTheDocument()
  })

  it('cambia el idioma de la app al guardar', async () => {
    await openAccount(user({ first_name: 'Ana', last_name: 'Ruiz' }))
    await userEvent.selectOptions(
      screen.getByLabelText('Idioma', { selector: 'select[name="language"]' }),
      'en',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(i18n.language).toBe('en'))
    // El aviso sale ya en el idioma nuevo.
    expect(await screen.findByText('Details saved.')).toBeInTheDocument()
  })

  it('rechaza archivos grandes sin subirlos', async () => {
    const { requests } = await openAccount()
    const row = screen.getByText('Certificado bancario').closest('li')!
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'banco.pdf', {
      type: 'application/pdf',
    })
    await userEvent.upload(within(row).getByLabelText('Subir'), big)
    expect(await screen.findByText('El archivo supera los 5 MB.')).toBeInTheDocument()
    expect(requests.filter((r) => r.url.endsWith('/documents/'))).toHaveLength(0)
  })

  it('salir cierra la sesión y vuelve a la portada', async () => {
    const { router } = await openAccount()
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))
    expect(useAuth.getState().refresh).toBeNull()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
  })
})
