import { useInfiniteQuery, useMutation } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { ApiErrorBody } from '@/api/errors'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

// Mismos límites que el backend (CHAT_FILE_MAX_MB, ATTACHMENT_EXTENSIONS).
export const ATTACHMENT_MAX_MB = 10
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'

const cursorOf = (url: string | null | undefined) =>
  url ? (new URL(url).searchParams.get('cursor') ?? undefined) : undefined

/** Mensajes de la publicación por páginas, del más nuevo al más viejo (la API usa cursor). */
export function useMessages(listingId: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(listingId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.GET('/api/listings/{listing_id}/messages/', {
        params: { path: { listing_id: listingId }, query: { cursor: pageParam } },
      })
      if (error || !data) throw error
      return data
    },
    getNextPageParam: (page) => cursorOf(page.next),
  })
}

export function useSendMessage(listingId: number) {
  return useMutation({
    mutationFn: async ({ text, file }: { text: string; file: File | null }) => {
      // Con adjunto va como multipart; solo texto, como JSON.
      const form = new FormData()
      form.append('text', text)
      if (file) form.append('attachment', file)
      const { data, error } = await api.POST('/api/listings/{listing_id}/messages/', {
        params: { path: { listing_id: listingId } },
        body: file ? ({} as never) : { text },
        ...(file ? { bodySerializer: () => form } : {}),
      })
      if (error || !data) throw error as ApiErrorBody
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.messages(listingId) }),
  })
}

export function useMarkRead(listingId: number) {
  return useMutation({
    mutationFn: async () => {
      await api.POST('/api/listings/{listing_id}/messages/read/', {
        params: { path: { listing_id: listingId } },
      })
    },
    // El contador de no leídos de la lista y de la cabecera cambia.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    },
  })
}

/** Abre un adjunto privado: se descarga con la sesión y se muestra en otra pestaña. */
export async function openAttachment(listingId: number, messageId: number) {
  const win = window.open('', '_blank') // en el clic; si no, el navegador la bloquea
  const { data } = await api.GET('/api/listings/{listing_id}/messages/{id}/attachment/', {
    params: { path: { listing_id: listingId, id: messageId } },
    parseAs: 'blob',
  })
  if (!data || !win) return win?.close()
  const url = URL.createObjectURL(data)
  win.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
