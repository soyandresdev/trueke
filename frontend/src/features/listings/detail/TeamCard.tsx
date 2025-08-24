import { Lock } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Listing } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { TextArea } from '@/components/ui/fields'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/format'

import { useAddNote, useAssign, useNotes } from '../api'

/** Trastienda del equipo: quién lleva el caso y las notas que el vendedor no ve. */
export function TeamCard({ listing, meId }: { listing: Listing; meId: number }) {
  const { t } = useTranslation()
  const titleId = useId()
  const assign = useAssign(listing.id)
  const notes = useNotes(listing.id, true)
  const addNote = useAddNote(listing.id)
  const [text, setText] = useState('')

  const owner = listing.assigned_to
  const isMine = owner?.id === meId

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const clean = text.trim()
    if (clean) addNote.mutate(clean, { onSuccess: () => setText('') })
  }

  return (
    <section className="rounded-lg border border-line bg-paper/50 p-5" aria-labelledby={titleId}>
      <h2 id={titleId} className="flex items-center gap-2 font-display text-lg font-bold">
        <Lock className="size-4 text-muted" aria-hidden />
        {t('team.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('team.private')}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-ink-soft">{t('team.owner')}: </span>
          <span className="font-semibold">
            {owner ? (isMine ? t('team.you') : owner.name) : t('team.nobody')}
          </span>
        </p>
        <Button
          variant={owner ? 'ghost' : 'secondary'}
          loading={assign.isPending}
          onClick={() => assign.mutate(isMine ? null : meId)}
        >
          {isMine ? t('team.leave') : t('team.take')}
        </Button>
      </div>

      <form className="mt-5 flex flex-col gap-3" onSubmit={submit}>
        <TextArea
          label={t('team.newNote')}
          rows={2}
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={addNote.isPending}
          disabled={!text.trim()}
        >
          {t('team.save')}
        </Button>
      </form>

      {notes.isPending ? (
        <Spinner className="mt-4 size-5 text-blue" />
      ) : notes.data?.length ? (
        <ul className="mt-5 flex flex-col gap-3">
          {notes.data.map((note) => (
            <li key={note.id} className="rounded-md border border-line bg-white p-3 text-sm">
              <p className="whitespace-pre-wrap">{note.text}</p>
              <p className="mt-1 text-xs text-muted">
                {note.author?.name || t('team.someone')} ·{' '}
                {formatDate(note.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">{t('team.noNotes')}</p>
      )}
    </section>
  )
}
