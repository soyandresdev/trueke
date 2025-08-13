/**
 * Cliente del WebSocket único del backend (`/ws/`, protocolo en backend/apps/realtime/consumers.py).
 * Vive fuera de React: una sola conexión, reconexión con espera creciente y suscripciones con
 * contador (varios componentes pueden pedir el mismo canal).
 */

export type RealtimeEvent = {
  channel: string
  event: string
  data: Record<string, unknown>
}

type Options = {
  url: string
  getToken: () => string | null
  /** Se llama cuando el servidor rechaza el token (cierre 4401). */
  refreshToken: () => Promise<string | null>
  onEvent: (event: RealtimeEvent) => void
  WebSocketImpl?: typeof WebSocket
}

export const CLOSE_UNAUTHENTICATED = 4401
const PING_MS = 25_000
const MAX_BACKOFF_MS = 30_000

export class RealtimeClient {
  private socket: WebSocket | null = null
  private authed = false
  private stopped = true
  private attempts = 0
  private channels = new Map<string, number>()
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private pingTimer: ReturnType<typeof setInterval> | undefined

  private readonly options: Options

  constructor(options: Options) {
    this.options = options
  }

  start() {
    if (!this.stopped) return
    this.stopped = false
    this.connect()
  }

  stop() {
    this.stopped = true
    clearTimeout(this.reconnectTimer)
    clearInterval(this.pingTimer)
    this.socket?.close(1000)
    this.socket = null
    this.authed = false
  }

  /** Se suscribe a `channel` y devuelve la función para soltarlo. */
  subscribe(channel: string): () => void {
    const count = this.channels.get(channel) ?? 0
    this.channels.set(channel, count + 1)
    if (count === 0) this.send({ type: 'subscribe', channel })
    return () => {
      const current = this.channels.get(channel) ?? 0
      if (current <= 1) {
        this.channels.delete(channel)
        this.send({ type: 'unsubscribe', channel })
      } else {
        this.channels.set(channel, current - 1)
      }
    }
  }

  private connect() {
    const token = this.options.getToken()
    if (!token) return
    const Impl = this.options.WebSocketImpl ?? WebSocket
    const socket = new Impl(this.options.url)
    this.socket = socket

    socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token }))
    socket.onmessage = (message) => this.handle(JSON.parse(String(message.data)))
    socket.onclose = (close) => {
      if (this.socket !== socket) return
      this.socket = null
      this.authed = false
      clearInterval(this.pingTimer)
      if (!this.stopped) void this.reconnect(close.code)
    }
  }

  private async reconnect(code: number) {
    if (code === CLOSE_UNAUTHENTICATED) {
      const token = await this.options.refreshToken()
      if (!token || this.stopped) return // sesión terminada: no se reintenta
    }
    const delay = Math.min(1000 * 2 ** this.attempts, MAX_BACKOFF_MS)
    this.attempts += 1
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  private handle(message: { type: string } & Partial<RealtimeEvent>) {
    if (message.type === 'auth.ok') {
      this.authed = true
      this.attempts = 0
      for (const channel of this.channels.keys()) this.send({ type: 'subscribe', channel })
      this.pingTimer = setInterval(() => this.send({ type: 'ping' }), PING_MS)
    } else if (message.type === 'event' && message.channel && message.event) {
      this.options.onEvent(message as RealtimeEvent)
    }
  }

  private send(payload: object) {
    // Antes de autenticar no se manda nada: al recibir auth.ok se envían todas las suscripciones.
    if (this.authed && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload))
    }
  }
}

export function defaultRealtimeUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/ws/`
}
