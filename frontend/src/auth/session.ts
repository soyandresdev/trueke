import { useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { User } from '@/api/types'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

import { useAuth } from './store'

/** El usuario de la sesión (`/api/me/`). Solo se pide si hay sesión. */
export function useMe() {
  const loggedIn = useAuth((state) => state.refresh !== null)
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/me/')
      if (error) throw error
      return data
    },
    enabled: loggedIn,
  })
}

export function startSession(tokens: { access: string; refresh: string }, user: User) {
  useAuth.getState().setTokens(tokens)
  queryClient.setQueryData(queryKeys.me, user)
}

export function endSession() {
  useAuth.getState().logout()
  queryClient.clear()
}
