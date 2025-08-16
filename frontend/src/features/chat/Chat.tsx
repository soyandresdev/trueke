import { CheckCheck, FileText, Paperclip, SendHorizontal, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ApiErrorBody } from '@/api/errors'
import type { Message } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'

import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_MB,
  openAttachment,
  useMarkRead,
  useMessages,
  useSendMessage,
} from './api'

type Props = {
  listingId: number
  /** Quien mira escribe como plataforma (operador) o como vendedor. */
  asPlatform: boolean
}

/** Chat de la publicación entre el vendedor y Trueke. Los mensajes nuevos llegan por el WebSocket. */
export function Chat({ listingId, asPlatform }: Props) {
  const { t } = useTranslation()
  const messages = useMessages(listingId)
  const markRead = useMarkRead(listingId)
  const scroller = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // La API da el más nuevo primero; en pantalla van de más viejo a más nuevo.
  const items = (messages.data?.pages.flatMap((page) => page.results) ?? []).toReversed()
  const newest = items.at(-1)
  const unreadFromOther = items.some((m) => m.from_platform !== asPlatform && !m.read_at)

  // Ver el chat marca como leídos los mensajes del otro lado (una vez por mensaje nuevo).
  const markedUpTo = useRef<number | null>(null)
  useEffect(() => {
    if (!unreadFromOther || !newest || markedUpTo.current === newest.id) return
    markedUpTo.current = newest.id
    markRead.mutate()
  }, [unreadFromOther, newest, markRead])

  // Baja al último mensaje cuando llega uno nuevo (no al cargar los anteriores).
  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollTop = element.scrollHeight
  }, [newest?.id])

  return (
    <section
      className="flex flex-col overflow-hidden rounded-lg border border-line"
      aria-labelledby={titleId}
    >
      <header className="border-b border-line bg-paper px-5 py-3">
        <h2 id={titleId} className="font-display text-lg font-bold">
          {asPlatform ? t('chat.withSeller') : t('chat.title')}
        </h2>
      </header>

      <div
        ref={scroller}
        className="flex h-96 flex-col gap-3 overflow-y-auto p-5"
        aria-live="polite"
      >
        {messages.hasNextPage && (
          <button
            type="button"
            onClick={() => void messages.fetchNextPage()}
            disabled={messages.isFetchingNextPage}
            className="mx-auto text-sm font-semibold text-blue hover:underline"
          >
            {t('chat.older')}
          </button>
        )}
        {messages.isPending ? (
          <Spinner className="m-auto size-6 text-blue" />
        ) : items.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-sm text-ink-soft">
            {asPlatform ? t('chat.emptyOperator') : t('chat.empty')}
          </p>
        ) : (
          items.map((message) => (
            <Bubble
              key={message.id}
              message={message}
              listingId={listingId}
              mine={message.from_platform === asPlatform}
            />
          ))
        )}
      </div>

      <Composer listingId={listingId} />
    </section>
  )
}

function Bubble({
  message,
  listingId,
  mine,
}: {
  message: Message
  listingId: number
  mine: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex max-w-[85%] flex-col gap-1',
        mine ? 'items-end self-end' : 'items-start self-start',
      )}
    >
      {!mine && (
        <span className="text-xs font-semibold text-ink-soft">
          {message.from_platform ? 'Trueke' : message.sender?.name}
        </span>
      )}
      <div
        className={cn(
          'rounded-lg px-4 py-2.5',
          mine ? 'rounded-br-sm bg-blue text-white' : 'rounded-bl-sm bg-paper text-ink',
        )}
      >
        {message.text && <p className="whitespace-pre-line">{message.text}</p>}
        {message.attachment_url && (
          <button
            type="button"
            onClick={() => void openAttachment(listingId, message.id)}
            className={cn(
              'mt-1 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold',
              mine ? 'bg-white/15 hover:bg-white/25' : 'bg-white hover:bg-line',
            )}
          >
            <FileText className="size-4" aria-hidden />
            {message.attachment_kind === 'pdf' ? t('chat.pdf') : t('chat.image')}
          </button>
        )}
      </div>
      <span className="flex items-center gap-1 font-mono text-[0.7rem] text-muted">
        {formatDate(message.created_at, { timeStyle: 'short' })}
        {mine && message.read_at && (
          <>
            <CheckCheck className="size-3.5 text-blue" aria-hidden />
            <span className="sr-only">{t('chat.read')}</span>
          </>
        )}
      </span>
    </div>
  )
}

function Composer({ listingId }: { listingId: number }) {
  const { t } = useTranslation()
  const fileId = useId()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const send = useSendMessage(listingId)
  const canSend = (text.trim() !== '' || file !== null) && !send.isPending

  const submit = () => {
    if (!canSend) return
    setError(null)
    send.mutate(
      { text: text.trim(), file },
      {
        onSuccess: () => {
          setText('')
          setFile(null)
        },
        onError: (body) => {
          const messages = Object.values((body ?? {}) as unknown as ApiErrorBody)
            .flat()
            .filter((v) => typeof v === 'string')
          setError(messages[0] ?? t('errors.generic'))
        },
      },
    )
  }

  const pick = (picked: File | undefined) => {
    if (!picked) return
    if (picked.size > ATTACHMENT_MAX_MB * 1024 * 1024)
      return setError(t('account.tooBig', { mb: ATTACHMENT_MAX_MB }))
    setError(null)
    setFile(picked)
  }

  return (
    <form
      className="border-t border-line p-3"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {file && (
        <p className="mb-2 inline-flex items-center gap-2 rounded-pill bg-paper py-1 pr-1 pl-3 text-sm">
          <Paperclip className="size-3.5" aria-hidden />
          <span className="max-w-48 truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="rounded-full p-1 hover:bg-line"
            aria-label={t('chat.removeFile')}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </p>
      )}
      <div className="flex items-end gap-2">
        <label
          htmlFor={fileId}
          className="cursor-pointer rounded-full p-2.5 text-ink-soft hover:bg-paper hover:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue"
        >
          <Paperclip className="size-5" aria-hidden />
          <span className="sr-only">{t('chat.attach')}</span>
          <input
            id={fileId}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              pick(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
        <label className="sr-only" htmlFor={`${fileId}-text`}>
          {t('chat.placeholder')}
        </label>
        <textarea
          id={`${fileId}-text`}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter envía; Shift+Enter hace un salto de línea.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder={t('chat.placeholder')}
          maxLength={4000}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-line px-3.5 py-2.5 [field-sizing:content] focus:border-blue focus:ring-2 focus:ring-blue-soft focus:outline-none"
        />
        <Button
          type="submit"
          disabled={!canSend}
          loading={send.isPending}
          className="size-11 px-0"
          aria-label={t('chat.send')}
        >
          {!send.isPending && <SendHorizontal className="size-5" aria-hidden />}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-tomato" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
