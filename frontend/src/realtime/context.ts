import { createContext, use, useEffect } from 'react'

import type { RealtimeClient } from './client'

export const RealtimeContext = createContext<RealtimeClient | null>(null)

/** Recibe en vivo los eventos de `channel` (p. ej. `listing.12`) mientras el componente esté montado. */
export function useRealtimeChannel(channel: string | null) {
  const client = use(RealtimeContext)
  useEffect(() => {
    if (!client || !channel) return
    return client.subscribe(channel)
  }, [client, channel])
}
