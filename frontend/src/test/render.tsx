import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, render } from '@testing-library/react'

import { queryClient } from '@/lib/queryClient'
import { routeTree } from '@/routeTree.gen'

/** Monta la app completa en `path` con el QueryClient real de la app. */
export async function renderApp(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { router, ...utils }
}
