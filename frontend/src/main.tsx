import '@fontsource-variable/gabarito'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/geist-mono'
import './styles.css'
import './i18n'

import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from './lib/queryClient'
import { RealtimeProvider } from './realtime/RealtimeProvider'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree, context: {}, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RouterProvider router={router} />
      </RealtimeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
