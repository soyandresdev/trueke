import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { api } from '@/api/client'
import type { ApiErrorBody } from '@/api/errors'
import type { Listing, ListingAction, ListingStatus } from '@/api/types'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

/** Convierte la respuesta de openapi-fetch en datos o en una excepción con el body del error. */
function unwrap<T>({
  data,
  error,
  response,
}: {
  data?: T
  error?: unknown
  response: Response
}): T {
  if (error !== undefined || data === undefined)
    throw { status: response.status, body: (error ?? {}) as ApiErrorBody }
  return data
}

export type ApiFailure = { status: number; body: ApiErrorBody }

export function useCategories() {
  const { i18n } = useTranslation()
  return useQuery({
    queryKey: queryKeys.categories(i18n.resolvedLanguage ?? i18n.language),
    queryFn: async () => unwrap(await api.GET('/api/categories/')),
    staleTime: 10 * 60_000, // cambian muy poco
  })
}

export type ListingFilters = {
  status?: ListingStatus
  q?: string
  city?: string
  category?: string
  page?: number
}

export function useListings(filters: ListingFilters) {
  return useQuery({
    queryKey: queryKeys.listingList(filters),
    queryFn: async () => unwrap(await api.GET('/api/listings/', { params: { query: filters } })),
    placeholderData: keepPreviousData, // al cambiar de pestaña no parpadea la lista
  })
}

export function useListingStats() {
  return useQuery({
    queryKey: queryKeys.listingStats,
    queryFn: async () => unwrap(await api.GET('/api/listings/stats/')),
  })
}

export function useListing(id: number) {
  return useQuery({
    queryKey: queryKeys.listing(id),
    queryFn: async () => unwrap(await api.GET('/api/listings/{id}/', { params: { path: { id } } })),
  })
}

export function useListingEvents(id: number) {
  return useQuery({
    queryKey: queryKeys.listingEvents(id),
    queryFn: async () =>
      unwrap(await api.GET('/api/listings/{id}/events/', { params: { path: { id } } })),
  })
}

type TransitionData = {
  offer: { amount: string; currency: string }
  pickup: { pickup_by: 'seller' | 'platform'; pickup_date?: string | null; notes?: string }
  reject: { reason?: string }
  cancel: { reason?: string }
  accept: Record<string, never>
  complete: Record<string, never>
  pay: { amount: string; paid_at?: string | null; reference?: string; receipt?: File | null }
}

async function postTransition<A extends ListingAction>(
  id: number,
  action: A,
  body: TransitionData[A],
) {
  // Con un archivo (el comprobante del pago) va como multipart; si no, como JSON.
  const hasFile = Object.values(body).some((value) => value instanceof File)
  const form = new FormData()
  for (const [key, value] of Object.entries(body)) {
    if (hasFile && value !== undefined && value !== null && value !== '') {
      form.append(key, value as string | Blob)
    }
  }
  const options = (
    hasFile
      ? { params: { path: { id } }, body: {}, bodySerializer: () => form }
      : { params: { path: { id } }, body }
  ) as never
  const call = {
    offer: () => api.POST('/api/listings/{id}/offer/', options),
    accept: () => api.POST('/api/listings/{id}/accept/', options),
    reject: () => api.POST('/api/listings/{id}/reject/', options),
    pickup: () => api.POST('/api/listings/{id}/pickup/', options),
    complete: () => api.POST('/api/listings/{id}/complete/', options),
    pay: () => api.POST('/api/listings/{id}/pay/', options),
    cancel: () => api.POST('/api/listings/{id}/cancel/', options),
  }[action]
  return unwrap(await call())
}

/** Aplica una transición y deja la publicación actualizada en caché (el historial se vuelve a pedir). */
export function useTransition(id: number) {
  return useMutation<
    Listing,
    ApiFailure,
    { [A in ListingAction]: { action: A; body: TransitionData[A] } }[ListingAction]
  >({
    mutationFn: ({ action, body }) => postTransition(id, action, body),
    onSuccess: (listing) => {
      queryClient.setQueryData(queryKeys.listing(id), listing)
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings })
    },
  })
}

export async function createListing(body: Record<string, unknown>) {
  return unwrap(await api.POST('/api/listings/', { body: body as never }))
}

export async function uploadListingImage(id: number, file: File, position: number) {
  const form = new FormData()
  form.append('image', file)
  form.append('position', String(position))
  return unwrap(
    await api.POST('/api/listings/{id}/images/', {
      params: { path: { id } },
      body: {} as never,
      bodySerializer: () => form,
    }),
  )
}

/** Perfil completo de un vendedor (solo operadores). */
export function useSeller(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['users', id] as const,
    queryFn: async () => unwrap(await api.GET('/api/users/{id}/', { params: { path: { id } } })),
    enabled,
  })
}

/** Abre un documento privado del vendedor en otra pestaña (se descarga con la sesión del operador). */
export async function openSellerDocument(id: number, kind: 'document' | 'bank-certificate') {
  const win = window.open('', '_blank') // en el clic; si no, el navegador la bloquea
  const { data } = await api.GET('/api/users/{id}/documents/{kind}/', {
    params: { path: { id, kind } },
    parseAs: 'blob',
  })
  if (!data || !win) return win?.close()
  const url = URL.createObjectURL(data)
  win.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function updateListing(id: number, body: Record<string, unknown>) {
  return unwrap(
    await api.PATCH('/api/listings/{id}/', { params: { path: { id } }, body: body as never }),
  )
}

export async function deleteListingImage(id: number, imageId: number) {
  const { error, response } = await api.DELETE('/api/listings/{id}/images/{image_id}/', {
    params: { path: { id, image_id: String(imageId) } },
  })
  if (error !== undefined || !response.ok)
    throw { status: response.status, body: (error ?? {}) as ApiErrorBody }
}

/** Abre el comprobante de pago (privado) en otra pestaña. */
export async function openPaymentReceipt(id: number) {
  const win = window.open('', '_blank') // en el clic; si no, el navegador la bloquea
  const { data } = await api.GET('/api/listings/{id}/receipt/', {
    params: { path: { id } },
    parseAs: 'blob',
  })
  if (!data || !win) return win?.close()
  const url = URL.createObjectURL(data)
  win.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
