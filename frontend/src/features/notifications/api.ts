import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import { useAuth } from '@/auth/store'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

export function useUnseenCount() {
  const loggedIn = useAuth((state) => state.refresh !== null)
  return useQuery({
    queryKey: queryKeys.notificationCount,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/notifications/unseen-count/')
      if (error || !data) throw error
      return data.count
    },
    enabled: loggedIn,
  })
}

/** Las últimas notificaciones. Solo se piden al abrir la campana. */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notificationList,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/notifications/')
      if (error || !data) throw error
      return data.results
    },
    enabled,
  })
}

const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications })

export function useMarkAllSeen() {
  return useMutation({
    mutationFn: async () => {
      await api.POST('/api/notifications/seen-all/')
    },
    onSuccess: refresh,
  })
}

export function useMarkSeen() {
  return useMutation({
    mutationFn: async (id: number) => {
      await api.POST('/api/notifications/{id}/seen/', { params: { path: { id } } })
    },
    onSuccess: refresh,
  })
}
