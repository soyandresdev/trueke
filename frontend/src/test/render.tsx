import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, render } from '@testing-library/react'
import { Profiler } from 'react'

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

/**
 * Igual que `renderApp`, pero cuenta los commits de React (cada vez que algo se vuelve a pintar).
 * `commits()` devuelve cuántos van; `reset()` pone el contador a cero.
 */
export async function renderAppProfiled(path: string) {
  let count = 0
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  const utils = render(
    <Profiler id="app" onRender={() => count++}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Profiler>,
  )
  await act(() => router.load())
  return {
    router,
    ...utils,
    commits: () => count,
    reset: () => {
      count = 0
    },
  }
}
