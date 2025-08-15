import '@testing-library/jest-dom/vitest'
import '@/i18n'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import { useAuth } from '@/auth/store'
import { queryClient } from '@/lib/queryClient'

afterEach(() => {
  cleanup()
  localStorage.clear()
  useAuth.setState({ access: null, refresh: null })
  queryClient.clear()
  vi.unstubAllGlobals()
})

// jsdom no implementa <dialog>.showModal/close.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false
  this.dispatchEvent(new Event('close'))
}
