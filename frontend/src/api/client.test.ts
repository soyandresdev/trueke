import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/auth/store'

import { api } from './client'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('cliente de la API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    useAuth.getState().setTokens({ access: 'viejo', refresh: 'r1' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  const urlOf = (input: RequestInfo | URL) =>
    new URL(input instanceof Request ? input.url : input).pathname

  it('manda el token y el idioma', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { id: 1 }))
    await api.GET('/api/me/')
    const request = fetchMock.mock.calls[0]![0] as Request
    expect(request.headers.get('Authorization')).toBe('Bearer viejo')
    expect(request.headers.get('Accept-Language')).toBeTruthy()
  })

  it('renueva el token al recibir 401 y repite la petición con el mismo body', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { detail: 'expirado' }))
      .mockResolvedValueOnce(json(200, { access: 'nuevo', refresh: 'r2' }))
      .mockResolvedValueOnce(json(200, { id: 1, first_name: 'Ana' }))

    const { data } = await api.PATCH('/api/me/', { body: { first_name: 'Ana' } })

    expect(data?.first_name).toBe('Ana')
    expect(useAuth.getState()).toMatchObject({ access: 'nuevo', refresh: 'r2' })
    const retried = fetchMock.mock.calls[2]![0] as Request
    expect(retried.headers.get('Authorization')).toBe('Bearer nuevo')
    expect(await retried.json()).toEqual({ first_name: 'Ana' })
  })

  it('si varias peticiones fallan a la vez, renueva una sola vez', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (urlOf(input) === '/api/auth/token/refresh/') return json(200, { access: 'nuevo' })
      const request = input as Request
      return request.headers.get('Authorization') === 'Bearer nuevo' ? json(200, {}) : json(401, {})
    })
    const [me, count] = await Promise.all([
      api.GET('/api/me/'),
      api.GET('/api/notifications/unseen-count/'),
    ])
    expect([me.response.status, count.response.status]).toEqual([200, 200])
    const refreshes = fetchMock.mock.calls.filter(
      ([input]) => urlOf(input) === '/api/auth/token/refresh/',
    )
    expect(refreshes).toHaveLength(1)
  })

  it('cierra la sesión si el refresh token ya no sirve', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(401, { detail: 'token inválido' }))
    const { response } = await api.GET('/api/me/')
    expect(response.status).toBe(401)
    expect(useAuth.getState()).toMatchObject({ access: null, refresh: null })
  })
})
