import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'

import { useToasts } from '@/components/ui/toast'
import i18n from '@/i18n'
import { notification } from '@/test/api'

import { applyRealtimeEvent, queryKeys } from './events'

function setup() {
  const client = new QueryClient()
  for (const key of [
    queryKeys.listings,
    queryKeys.listing(1),
    queryKeys.messages(1),
    queryKeys.notifications,
  ]) {
    client.setQueryData(key, {})
  }
  const invalid = () =>
    client
      .getQueryCache()
      .getAll()
      .filter((q) => q.state.isInvalidated)
      .map((q) => q.queryKey)
  return { client, invalid }
}

describe('eventos en vivo', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es')
    useToasts.setState({ toasts: [] })
  })

  it('un mensaje nuevo invalida la publicación, sus mensajes y la lista', () => {
    const { client, invalid } = setup()
    applyRealtimeEvent(client, {
      channel: 'listing.1',
      event: 'message.created',
      data: { listing: 1 },
    })
    expect(invalid()).toEqual([queryKeys.listings, queryKeys.listing(1), queryKeys.messages(1)])
  })

  it('una notificación nueva invalida las notificaciones y muestra un aviso', () => {
    const { client, invalid } = setup()
    applyRealtimeEvent(client, {
      channel: 'user.7',
      event: 'notification.created',
      data: notification(),
    })
    expect(invalid()).toEqual([queryKeys.notifications])
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual([
      expect.stringMatching(/^Tienes una oferta por «Teclado MIDI»/),
    ])
  })

  it('no avisa de mensajes nuevos del chat que ya está abierto', () => {
    const { client } = setup()
    window.history.pushState({}, '', '/publicaciones/13')
    applyRealtimeEvent(client, {
      channel: 'user.7',
      event: 'notification.created',
      data: notification({ kind: 'message.new', data: { count: 1 } }),
    })
    expect(useToasts.getState().toasts).toEqual([])
    window.history.pushState({}, '', '/')
  })

  it('ignora eventos desconocidos', () => {
    const { client, invalid } = setup()
    applyRealtimeEvent(client, { channel: 'user.7', event: 'otra.cosa', data: {} })
    expect(invalid()).toEqual([])
  })
})
