import { useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { User } from '@/api/types'
import i18n from '@/i18n'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

import { useAuth } from './store'

const meQuery = {
  queryKey: queryKeys.me,
  queryFn: async () => {
    const { data, error } = await api.GET('/api/me/')
    if (error) throw error
    return data
  },
}

/** El usuario de la sesión (`/api/me/`). Solo se pide si hay sesión. */
export function useMe() {
  const loggedIn = useAuth((state) => state.refresh !== null)
  return useQuery({ ...meQuery, enabled: loggedIn })
}

/** El usuario fuera de React, para los guardas de ruta: reutiliza lo que ya esté en caché. */
export async function ensureMe() {
  try {
    return await queryClient.ensureQueryData(meQuery)
  } catch {
    return undefined
  }
}

export function startSession(tokens: { access: string; refresh: string }, user: User) {
  useAuth.getState().setTokens(tokens)
  queryClient.setQueryData(queryKeys.me, user)
  // El idioma elegido en el perfil manda sobre el del navegador.
  if (user.language) void i18n.changeLanguage(user.language)
}

export function endSession() {
  useAuth.getState().logout()
  queryClient.clear()
}
