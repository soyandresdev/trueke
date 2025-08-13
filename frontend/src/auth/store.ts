import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type Tokens = { access: string; refresh: string }

type AuthState = {
  access: string | null
  refresh: string | null
  setTokens: (tokens: Tokens) => void
  logout: () => void
}

/** Tokens de la sesión. Solo estado de cliente: los datos del usuario vienen de la API (`/api/me/`). */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      refresh: null,
      setTokens: ({ access, refresh }) => set({ access, refresh }),
      logout: () => set({ access: null, refresh: null }),
    }),
    { name: 'trueke-auth', storage: createJSONStorage(() => localStorage) },
  ),
)

export const isLoggedIn = () => useAuth.getState().refresh !== null
