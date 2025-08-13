import { apiBaseUrl } from '@/lib/config'

import { useAuth } from './store'

let inFlight: Promise<string | null> | null = null

/**
 * Pide un access token nuevo con el refresh token. Si varias peticiones fallan a la vez,
 * comparten la misma renovación. Devuelve null (y cierra la sesión) si ya no se puede renovar.
 */
export function refreshAccessToken(): Promise<string | null> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function doRefresh(): Promise<string | null> {
  const { refresh, setTokens, logout } = useAuth.getState()
  if (!refresh) return null
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!response.ok) {
      logout()
      return null
    }
    const data = (await response.json()) as { access: string; refresh?: string }
    setTokens({ access: data.access, refresh: data.refresh ?? refresh })
    return data.access
  } catch {
    return null // sin red: se mantiene la sesión y se reintenta en la próxima petición
  }
}
