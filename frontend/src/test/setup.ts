import '@testing-library/jest-dom/vitest'
import '@/i18n'

import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import { useAuth } from '@/auth/store'
import { queryClient } from '@/lib/queryClient'

// Con los tests en paralelo, los flujos completos a veces tardan más de 1 s en pintar el siguiente paso.
configure({ asyncUtilTimeout: 3000 })

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

// jsdom no implementa el atributo `popover` ni los botones con `popovertarget`.
if (
  !('showPopover' in HTMLElement.prototype) ||
  !document.createElement('button').popoverTargetElement
) {
  const toggle = (element: HTMLElement, open: boolean) => {
    if (element.dataset.popoverOpen === String(open)) return
    element.dataset.popoverOpen = String(open)
    element.style.display = open ? 'block' : ''
    element.dispatchEvent(
      Object.assign(new Event('toggle'), { newState: open ? 'open' : 'closed' }),
    )
  }
  Object.assign(HTMLElement.prototype, {
    showPopover(this: HTMLElement) {
      toggle(this, true)
    },
    hidePopover(this: HTMLElement) {
      toggle(this, false)
    },
    togglePopover(this: HTMLElement) {
      toggle(this, this.dataset.popoverOpen !== 'true')
    },
  })
  document.addEventListener('click', (event) => {
    const invoker = (event.target as Element | null)?.closest?.('[popovertarget]')
    const target = invoker && document.getElementById(invoker.getAttribute('popovertarget')!)
    if (target) (target as HTMLElement).togglePopover()
  })
}
