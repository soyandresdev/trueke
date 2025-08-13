import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los cambios llegan por WebSocket e invalidan las queries; no hace falta refrescar al enfocar.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
})
