import type { QueryClient } from '@tanstack/react-query'

import type { RealtimeEvent } from './client'

/** Claves de TanStack Query compartidas por toda la app. */
export const queryKeys = {
  me: ['me'] as const,
  listings: ['listings'] as const,
  listing: (id: number) => ['listings', id] as const,
  messages: (listingId: number) => ['listings', listingId, 'messages'] as const,
  notifications: ['notifications'] as const,
}

/**
 * Los eventos del servidor no se copian a estado local: solo invalidan las queries afectadas
 * y TanStack Query vuelve a pedir lo que esté en pantalla.
 */
export function applyRealtimeEvent(queryClient: QueryClient, { event }: RealtimeEvent) {
  switch (event) {
    // `listings` cubre por prefijo la lista (contador de no leídos), el detalle y los mensajes.
    case 'message.created':
    case 'message.read':
    case 'listing.status':
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings })
      break
    case 'notification.created':
    case 'notification.seen':
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      break
  }
}
