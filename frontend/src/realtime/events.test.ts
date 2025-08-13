import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

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
  it('un mensaje nuevo invalida la publicación, sus mensajes y la lista', () => {
    const { client, invalid } = setup()
    applyRealtimeEvent(client, {
      channel: 'listing.1',
      event: 'message.created',
      data: { listing: 1 },
    })
    expect(invalid()).toEqual([queryKeys.listings, queryKeys.listing(1), queryKeys.messages(1)])
  })

  it('una notificación solo invalida las notificaciones', () => {
    const { client, invalid } = setup()
    applyRealtimeEvent(client, { channel: 'user.7', event: 'notification.created', data: {} })
    expect(invalid()).toEqual([queryKeys.notifications])
  })

  it('ignora eventos desconocidos', () => {
    const { client, invalid } = setup()
    applyRealtimeEvent(client, { channel: 'user.7', event: 'otra.cosa', data: {} })
    expect(invalid()).toEqual([])
  })
})
