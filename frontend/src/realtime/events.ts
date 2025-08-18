import type { QueryClient } from '@tanstack/react-query'

import type { Notification } from '@/api/types'
import { toast } from '@/components/ui/toast'
import { notificationText } from '@/features/notifications/text'

import type { RealtimeEvent } from './client'

/** Claves de TanStack Query compartidas por toda la app. */
export const queryKeys = {
  me: ['me'] as const,
  listings: ['listings'] as const,
  listingList: (filters: object) => ['listings', 'list', filters] as const,
  listingStats: ['listings', 'stats'] as const,
  listing: (id: number) => ['listings', id] as const,
  listingEvents: (id: number) => ['listings', id, 'events'] as const,
  // Los nombres vienen traducidos del backend: cada idioma es otra consulta.
  categories: (language: string) => ['categories', language] as const,
  messages: (listingId: number) => ['listings', listingId, 'messages'] as const,
  notifications: ['notifications'] as const,
  notificationCount: ['notifications', 'count'] as const,
  notificationList: ['notifications', 'list'] as const,
}

/**
 * Los eventos del servidor no se copian a estado local: solo invalidan las queries afectadas
 * y TanStack Query vuelve a pedir lo que esté en pantalla.
 */
export function applyRealtimeEvent(queryClient: QueryClient, { event, data }: RealtimeEvent) {
  switch (event) {
    // `listings` cubre por prefijo la lista (contador de no leídos), el detalle y los mensajes.
    case 'message.created':
    case 'message.read':
    case 'listing.status':
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings })
      break
    case 'notification.created': {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      // Cada notificación viene de un cambio en una publicación: así la lista del operador (que no
      // está suscrito a cada publicación) también se actualiza en vivo.
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings })
      // Aviso breve además de la campana, salvo mensajes del chat que ya se está viendo.
      const notification = data as unknown as Notification
      const chatOpen = window.location.pathname === `/publicaciones/${notification.listing?.id}`
      if (!(notification.kind === 'message.new' && chatOpen))
        toast.info(notificationText(notification))
      break
    }
    case 'notification.seen':
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      break
  }
}
