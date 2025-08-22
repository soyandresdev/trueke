import { vi } from 'vitest'

type Handler = (request: Request) => unknown | Promise<unknown>
/** Respuesta con un código distinto de 200. Es una clase para no confundirla con un body que tenga `status`. */
export class Reply {
  readonly status: number
  readonly body?: unknown

  constructor(status: number, body?: unknown) {
    this.status = status
    this.body = body
  }
}

export const reply = (status: number, body?: unknown) => new Reply(status, body)

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
      const { status, body } = result instanceof Reply ? result : { status: 200, body: result }
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

export const category = (overrides: Record<string, unknown> = {}) => ({
  id: 2,
  code: 'instrumentos',
  name: 'Instrumentos musicales',
  fields_schema: {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        title: 'Tipo',
        enum: ['string', 'keys'],
        'x-labels': { string: 'Cuerda', keys: 'Teclado' },
      },
      brand: { type: 'string', title: 'Marca', maxLength: 60 },
    },
    required: ['kind'],
  },
  ...overrides,
})

export const listing = (overrides: Record<string, unknown> = {}) => ({
  id: 13,
  seller: { id: 7, name: 'Laura Gómez' },
  category: 2,
  title: 'Teclado MIDI',
  description: 'Todas las teclas funcionan.',
  condition: 'like_new',
  attributes: { kind: 'keys', brand: 'Arturia' },
  city: 'Bogotá',
  pickup_address: 'Calle 1',
  is_original: true,
  terms_accepted_at: '2026-09-19T12:00:00Z',
  images: [
    {
      id: 1,
      image: 'http://localhost/media/1.webp',
      thumbnail: 'http://localhost/media/1-min.webp',
      position: 0,
    },
  ],
  status: 'in_review',
  status_changed_at: '2026-09-19T12:00:00Z',
  offer_amount: null,
  offer_currency: '',
  pickup_by: '',
  pickup_date: null,
  pickup_notes: '',
  cancel_reason: '',
  available_actions: ['cancel'],
  unread_messages: 0,
  created_at: '2026-09-19T12:00:00Z',
  updated_at: '2026-09-19T12:00:00Z',
  ...overrides,
})

export const message = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  listing: 13,
  sender: { id: 1, name: 'Sara Operadora' },
  from_platform: true,
  text: 'Hola, ¿sigue disponible?',
  attachment_kind: '',
  attachment_url: null,
  created_at: '2026-09-19T12:00:00Z',
  read_at: null,
  ...overrides,
})

export const notification = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  kind: 'listing.offer',
  listing: { id: 13, title: 'Teclado MIDI', status: 'offered' },
  actor: { id: 1, name: 'Sara Operadora' },
  data: { status: 'offered', amount: '380000.00', currency: 'COP' },
  created_at: '2026-09-19T12:00:00Z',
  seen_at: null,
  ...overrides,
})
