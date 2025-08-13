import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CLOSE_UNAUTHENTICATED, RealtimeClient, type RealtimeEvent } from './client'

class FakeSocket {
  static instances: FakeSocket[] = []
  readyState: number = WebSocket.CONNECTING
  sent: Record<string, unknown>[] = []
  onopen: (() => void) | null = null
  onmessage: ((message: { data: string }) => void) | null = null
  onclose: ((close: { code: number }) => void) | null = null

  url: string

  constructor(url: string) {
    this.url = url
    FakeSocket.instances.push(this)
  }
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close(code = 1000) {
    this.readyState = WebSocket.CLOSED
    this.onclose?.({ code })
  }
  // Ayudas para el test
  open() {
    this.readyState = WebSocket.OPEN
    this.onopen?.()
  }
  receive(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
  types() {
    return this.sent.map((m) => (m.channel ? `${m.type}:${m.channel}` : m.type))
  }
}

const last = () => FakeSocket.instances.at(-1)!

describe('RealtimeClient', () => {
  let token: string | null
  let events: RealtimeEvent[]
  let refreshToken: ReturnType<typeof vi.fn<() => Promise<string | null>>>
  let client: RealtimeClient

  beforeEach(() => {
    vi.useFakeTimers()
    FakeSocket.instances = []
    token = 't1'
    events = []
    refreshToken = vi.fn<() => Promise<string | null>>(async () => 't2')
    client = new RealtimeClient({
      url: 'ws://test/ws/',
      getToken: () => token,
      refreshToken,
      onEvent: (event) => events.push(event),
      WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
    })
  })
  afterEach(() => {
    client.stop()
    vi.useRealTimers()
  })

  it('se autentica primero y se suscribe después de auth.ok', () => {
    client.start()
    client.subscribe('listing.1')
    last().open()
    expect(last().types()).toEqual(['auth'])
    expect(last().sent[0]).toEqual({ type: 'auth', token: 't1' })

    last().receive({ type: 'auth.ok', user: 7 })
    expect(last().types()).toEqual(['auth', 'subscribe:listing.1'])
  })

  it('cuenta las suscripciones: solo se va del canal cuando lo suelta el último', () => {
    client.start()
    last().open()
    last().receive({ type: 'auth.ok', user: 7 })
    const a = client.subscribe('listing.1')
    const b = client.subscribe('listing.1')
    a()
    expect(last().types()).toEqual(['auth', 'subscribe:listing.1'])
    b()
    expect(last().types()).toEqual(['auth', 'subscribe:listing.1', 'unsubscribe:listing.1'])
  })

  it('entrega los eventos', () => {
    client.start()
    last().open()
    last().receive({ type: 'auth.ok', user: 7 })
    last().receive({
      type: 'event',
      channel: 'user.7',
      event: 'notification.created',
      data: { id: 1 },
    })
    expect(events).toEqual([
      { type: 'event', channel: 'user.7', event: 'notification.created', data: { id: 1 } },
    ])
  })

  it('se reconecta con espera creciente y vuelve a suscribirse', async () => {
    client.start()
    client.subscribe('listing.1')
    last().open()
    last().receive({ type: 'auth.ok', user: 7 })

    last().close(1006)
    expect(FakeSocket.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(FakeSocket.instances).toHaveLength(2)

    last().close(1006) // falla otra vez antes de abrir: espera el doble
    await vi.advanceTimersByTimeAsync(1999)
    expect(FakeSocket.instances).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeSocket.instances).toHaveLength(3)

    last().open()
    last().receive({ type: 'auth.ok', user: 7 })
    expect(last().types()).toEqual(['auth', 'subscribe:listing.1'])
  })

  it('si el servidor rechaza el token, lo renueva antes de reconectar', async () => {
    client.start()
    last().open()
    token = null
    refreshToken.mockImplementation(async () => {
      token = 't2'
      return 't2'
    })
    last().close(CLOSE_UNAUTHENTICATED)
    await vi.advanceTimersByTimeAsync(1000)
    last().open()
    expect(refreshToken).toHaveBeenCalledOnce()
    expect(last().sent[0]).toEqual({ type: 'auth', token: 't2' })
  })

  it('no reintenta si la sesión terminó', async () => {
    refreshToken.mockResolvedValue(null)
    client.start()
    last().open()
    last().close(CLOSE_UNAUTHENTICATED)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
  })

  it('stop() cierra y no reconecta', async () => {
    client.start()
    last().open()
    client.stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeSocket.instances).toHaveLength(1)
  })
})
