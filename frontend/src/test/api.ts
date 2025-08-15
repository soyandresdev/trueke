import { vi } from 'vitest'

type Handler = (request: Request) => unknown | Promise<unknown>
export type Reply = { status: number; body?: unknown }

export const reply = (status: number, body?: unknown): Reply => ({ status, body })

/**
 * Sustituye `fetch` y responde según "MÉTODO /ruta". Un handler devuelve el body (200)
 * o `reply(status, body)`. Devuelve la lista de peticiones recibidas.
 */
export function mockApi(routes: Record<string, Handler>) {
  const requests: Request[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init)
      requests.push(request.clone())
      const key = `${request.method} ${new URL(request.url).pathname}`
      const handler = routes[key]
      if (!handler)
        return new Response(JSON.stringify({ detail: `Sin mock: ${key}` }), { status: 500 })
      const result = await handler(request)
      const { status, body } =
        result && typeof result === 'object' && 'status' in result
          ? (result as Reply)
          : { status: 200, body: result }
      return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
  return requests
}

export const user = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  phone: '+573001112233',
  first_name: '',
  last_name: '',
  email: '',
  photo: null,
  language: 'es',
  role: 'seller',
  document_type: '',
  document_number: '',
  has_document_file: false,
  has_bank_certificate: false,
  profile_complete: false,
  date_joined: '2026-09-19T12:00:00Z',
  ...overrides,
})
