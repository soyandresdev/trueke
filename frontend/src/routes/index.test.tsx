import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { routeTree } from '@/routeTree.gen'

async function renderAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await act(() => router.load())
}

describe('portada', () => {
  it('se muestra en español por defecto y cambia a inglés', async () => {
    await act(() => i18n.changeLanguage('es'))
    await renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lo que ya no usas')
    expect(document.documentElement.lang).toBe('es')

    await userEvent.selectOptions(screen.getByRole('combobox'), 'en')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What you no longer use')
    expect(document.documentElement.lang).toBe('en')
  })

  it('muestra un 404 para rutas desconocidas', async () => {
    await act(() => i18n.changeLanguage('es'))
    await renderAt('/no-existe')
    expect(screen.getByText('Esta página no existe.')).toBeInTheDocument()
  })
})
