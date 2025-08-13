import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'

import { refreshAccessToken } from '@/auth/refresh'
import { useAuth } from '@/auth/store'

import { defaultRealtimeUrl, RealtimeClient } from './client'
import { RealtimeContext } from './context'
import { applyRealtimeEvent } from './events'

/** Una sola conexión para toda la app, abierta mientras haya sesión. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const loggedIn = useAuth((state) => state.refresh !== null)
  const [client] = useState(
    () =>
      new RealtimeClient({
        url: defaultRealtimeUrl(),
        getToken: () => useAuth.getState().access,
        refreshToken: refreshAccessToken,
        onEvent: (event) => applyRealtimeEvent(queryClient, event),
      }),
  )

  // Sincroniza la conexión (sistema externo) con la sesión.
  useEffect(() => {
    if (!loggedIn) return
    client.start()
    return () => client.stop()
  }, [client, loggedIn])

  return <RealtimeContext value={client}>{children}</RealtimeContext>
}
