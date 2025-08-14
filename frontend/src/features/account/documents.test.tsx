// @vitest-environment happy-dom
// En jsdom (con Vitest 5) un File dentro de FormData rompe `new Request(...)`; happy-dom lo soporta.
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuth } from '@/auth/store'
import i18n from '@/i18n'
import { mockApi, user } from '@/test/api'
import { renderApp } from '@/test/render'

beforeEach(async () => {
  await i18n.changeLanguage('es')
  act(() => useAuth.getState().setTokens({ access: 'a1', refresh: 'r1' }))
})

async function openAccount(me = user()) {
  const requests = mockApi({
    'GET /api/me/': () => me,
    'PATCH /api/me/documents/': () => ({ ...me, has_document_file: true }),
  })
  await renderApp('/cuenta')
  await screen.findByRole('heading', { name: 'Mi cuenta' })
  return { requests }
}

describe('documentos', () => {
  it('sube un documento como multipart', async () => {
    const { requests } = await openAccount()
    const row = screen.getByText('Documento de identidad').closest('li')!
    const file = new File(['%PDF'], 'cedula.pdf', { type: 'application/pdf' })
    await userEvent.upload(within(row).getByLabelText('Subir'), file)

    expect(await screen.findByText('Archivo subido.')).toBeInTheDocument()
    const upload = requests.find((r) => r.url.endsWith('/api/me/documents/'))!
    expect(upload.headers.get('Content-Type')).toMatch(/^multipart\/form-data; boundary=/)
    const body = await upload.formData()
    expect((body.get('document_file') as File).name).toBe('cedula.pdf')
    expect(within(row).getByText('Subido')).toBeInTheDocument()
  })
})
