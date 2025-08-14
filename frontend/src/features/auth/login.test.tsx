import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { mockApi, reply, user } from '@/test/api'
import { renderApp } from '@/test/render'

beforeEach(async () => {
  await i18n.changeLanguage('es')
})

const tokens = { access: 'a1', refresh: 'r1' }

describe('entrar', () => {
  it('pide el código, lo verifica y lleva a "Mi cuenta" si falta el perfil', async () => {
    const requests = mockApi({
      'POST /api/auth/otp/request/': () => reply(202, { expires_in: 300, resend_in: 60 }),
      'POST /api/auth/otp/verify/': () => ({ ...tokens, created: true, user: user() }),
      'GET /api/me/': () => user(),
    })
    const { router } = await renderApp('/entrar')

    await userEvent.type(screen.getByLabelText('Teléfono'), '300 111 2233')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(await screen.findByText('Lo enviamos al 300 111 2233.')).toBeInTheDocument()
    expect(screen.getByText('Puedes pedir otro código en 60 s.')).toBeInTheDocument()

    // Con 6 dígitos se envía solo.
    await userEvent.type(screen.getByLabelText('Código'), '123456')

    await waitFor(() => expect(router.state.location.pathname).toBe('/cuenta'))
    expect(useAuth.getState()).toMatchObject(tokens)
    const verify = requests.find((r) => r.url.endsWith('/otp/verify/'))!
    expect(await verify.json()).toEqual({ phone: '300 111 2233', code: '123456' })
  })

  it('valida el teléfono antes de llamar a la API', async () => {
    const requests = mockApi({})
    await renderApp('/entrar')
    await userEvent.type(screen.getByLabelText('Teléfono'), 'abc')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByText('Escribe un número de teléfono válido.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('muestra el error del servidor en el campo', async () => {
    mockApi({
      'POST /api/auth/otp/request/': () =>
        reply(400, { phone: ['Número no válido para Colombia.'] }),
    })
    await renderApp('/entrar')
    await userEvent.type(screen.getByLabelText('Teléfono'), '123 4567')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByText('Número no válido para Colombia.')).toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono')).toHaveAttribute('aria-invalid', 'true')
  })

  it('si ya hay un código vigente pasa al paso 2 con la espera del servidor', async () => {
    mockApi({
      'POST /api/auth/otp/request/': () =>
        reply(429, { code: 'resend_too_soon', detail: 'Espera', wait: 42 }),
    })
    await renderApp('/entrar')
    await userEvent.type(screen.getByLabelText('Teléfono'), '3001112233')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByText('Puedes pedir otro código en 42 s.')).toBeInTheDocument()
  })

  it('código incorrecto: muestra el error y no inicia sesión', async () => {
    mockApi({
      'POST /api/auth/otp/request/': () => reply(202, { expires_in: 300, resend_in: 60 }),
      'POST /api/auth/otp/verify/': () =>
        reply(400, { code: 'invalid_code', detail: 'El código es incorrecto o ya venció.' }),
    })
    await renderApp('/entrar')
    await userEvent.type(screen.getByLabelText('Teléfono'), '3001112233')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    await userEvent.type(await screen.findByLabelText('Código'), '000000')
    expect(await screen.findByText('El código es incorrecto o ya venció.')).toBeInTheDocument()
    expect(useAuth.getState().refresh).toBeNull()
  })
})

describe('rutas privadas', () => {
  it('sin sesión, /cuenta manda a /entrar y después vuelve', async () => {
    mockApi({
      'POST /api/auth/otp/request/': () => reply(202, { expires_in: 300, resend_in: 60 }),
      'POST /api/auth/otp/verify/': () => ({
        ...tokens,
        created: false,
        user: user({ profile_complete: true }),
      }),
      'GET /api/me/': () => user({ profile_complete: true }),
    })
    const { router } = await renderApp('/cuenta')
    expect(router.state.location.pathname).toBe('/entrar')
    expect(router.state.location.search).toEqual({ redirect: '/cuenta' })

    await userEvent.type(screen.getByLabelText('Teléfono'), '3001112233')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    await userEvent.type(await screen.findByLabelText('Código'), '123456')
    await waitFor(() => expect(router.state.location.pathname).toBe('/cuenta'))
  })

  it('ignora redirecciones a otros sitios', async () => {
    const { router } = await renderApp('/entrar?redirect=%2F%2Fevil.example')
    expect(router.state.location.search).toEqual({})
  })

  it('con sesión, /entrar lleva a la cuenta', async () => {
    mockApi({ 'GET /api/me/': () => user() })
    act(() => useAuth.getState().setTokens(tokens))
    const { router } = await renderApp('/entrar')
    expect(router.state.location.pathname).toBe('/cuenta')
  })
})
