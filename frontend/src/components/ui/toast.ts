import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'
export type Toast = { id: number; kind: ToastKind; message: string }

type ToastState = {
  toasts: Toast[]
  show: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
}

const DURATION_MS = 5000
let nextId = 1

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (kind, message) => {
    const id = nextId++
    set({ toasts: [...get().toasts, { id, kind, message }].slice(-3) })
    setTimeout(() => get().dismiss(id), DURATION_MS)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}))

/** Avisos cortos desde cualquier sitio (también fuera de React): `toast.success('Guardado')`. */
export const toast = {
  success: (message: string) => useToasts.getState().show('success', message),
  error: (message: string) => useToasts.getState().show('error', message),
  info: (message: string) => useToasts.getState().show('info', message),
}
