import createClient, { type Middleware } from 'openapi-fetch'

import { refreshAccessToken } from '@/auth/refresh'
import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { apiBaseUrl } from '@/lib/config'

import type { paths } from './schema'

/** Copias de cada petición para poder repetirla tras renovar el token (el body ya se consumió). */
const retries = new Map<string, Request>()

const auth: Middleware = {
  onRequest({ request, id }) {
    const { access } = useAuth.getState()
    if (access) request.headers.set('Authorization', `Bearer ${access}`)
    request.headers.set('Accept-Language', i18n.language)
    retries.set(id, request.clone())
    return request
  },
  async onResponse({ response, id }) {
    const original = retries.get(id)
    retries.delete(id)
    if (response.status !== 401 || !original || original.url.includes('/api/auth/')) return response
    const access = await refreshAccessToken()
    if (!access) return response
    original.headers.set('Authorization', `Bearer ${access}`)
    return fetch(original)
  },
  onError({ id }) {
    retries.delete(id)
  },
}

export const api = createClient<paths>({
  baseUrl: apiBaseUrl,
  // Se resuelve en cada llamada (no al importar) para que los tests puedan sustituir `fetch`.
  fetch: (request) => globalThis.fetch(request),
})
api.use(auth)
