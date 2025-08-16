import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los cambios llegan por WebSocket e invalidan las queries; no hace falta refrescar al enfocar.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      // Un reintento para fallos de red o del servidor; un 4xx (404, 403…) no va a cambiar.
      retry: (failures, error) => {
        const status = (error as { status?: number } | null)?.status
        return failures < 1 && !(status !== undefined && status >= 400 && status < 500)
      },
    },
  },
})
