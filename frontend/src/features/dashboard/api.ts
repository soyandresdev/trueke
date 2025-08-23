import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { OfferOrdering, Queue } from '@/api/types'
import { queryKeys } from '@/realtime/events'

import { unwrap } from '../listings/api'

export type OfferFilters = {
  queue?: Queue
  q?: string
  city?: string
  category?: string
  ordering?: OfferOrdering
  page?: number
}

/** Colas de trabajo, embudo y números del periodo (solo operadores). */
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => unwrap(await api.GET('/api/listings/dashboard/')),
  })
}

export function useOffers(filters: OfferFilters) {
  return useQuery({
    queryKey: queryKeys.offers(filters),
    queryFn: async () =>
      unwrap(await api.GET('/api/listings/offers/', { params: { query: filters } })),
    placeholderData: keepPreviousData, // al ordenar o pasar de página no parpadea la tabla
  })
}

/** Descarga la tabla con los filtros de la pantalla. El navegador no puede pedirla solo: lleva sesión. */
export async function downloadOffers(filters: OfferFilters, name: string) {
  const { data } = await api.GET('/api/listings/offers/export/', {
    params: { query: filters },
    parseAs: 'blob',
  })
  if (!data) return
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
