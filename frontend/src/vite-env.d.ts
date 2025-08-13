/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del backend en producción (p. ej. https://api.trueke.app). Vacío = mismo origen. */
  readonly VITE_API_URL?: string
  /** URL del WebSocket si no es `<origen>/ws/`. */
  readonly VITE_WS_URL?: string
}
