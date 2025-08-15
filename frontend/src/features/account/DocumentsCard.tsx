import { useMutation } from '@tanstack/react-query'
import { CircleCheck, CircleDashed, Eye, Upload } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { api } from '@/api/client'
import { type ApiErrorBody } from '@/api/errors'
import type { User } from '@/api/types'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/toast'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

// Mismos límites que el backend (PRIVATE_FILE_MAX_MB y PRIVATE_EXTENSIONS); el backend es quien manda.
const MAX_MB = 5
const ACCEPT = '.pdf,.jpg,.jpeg,.png'

const documents = [
  { kind: 'document', field: 'document_file', has: 'has_document_file' },
  { kind: 'bank-certificate', field: 'bank_certificate', has: 'has_bank_certificate' },
] as const
type Doc = (typeof documents)[number]

export function DocumentsCard({ user }: { user: User }) {
  return (
    <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
      {documents.map((doc) => (
        <DocumentRow key={doc.kind} doc={doc} uploaded={Boolean(user[doc.has])} />
      ))}
    </ul>
  )
}

function DocumentRow({ doc, uploaded }: { doc: Doc; uploaded: boolean }) {
  const { t } = useTranslation()
  const inputId = useId()

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append(doc.field, file)
      const { data, error } = await api.PATCH('/api/me/documents/', {
        body: {},
        bodySerializer: () => formData,
      })
      if (error) throw error as ApiErrorBody
      return data
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user)
      toast.success(t('account.uploaded'))
    },
    onError: (body: ApiErrorBody) => {
      const message = Object.values(body)
        .flat()
        .find((value) => typeof value === 'string')
      toast.error(message ?? t('errors.generic'))
    },
  })

  const pick = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(t('account.tooBig', { mb: MAX_MB }))
    upload.mutate(file)
  }

  const view = async () => {
    // La ventana se abre en el clic (si no, el navegador la bloquea) y luego recibe el archivo.
    const win = window.open('', '_blank')
    const { data } = await api.GET('/api/me/documents/{kind}/', {
      params: { path: { kind: doc.kind } },
      parseAs: 'blob',
    })
    if (!data || !win) return win?.close()
    const url = URL.createObjectURL(data)
    win.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <li className="flex flex-wrap items-center gap-4 p-4">
      {uploaded ? (
        <CircleCheck className="size-6 shrink-0 text-lime-dark" aria-hidden />
      ) : (
        <CircleDashed className="size-6 shrink-0 text-muted" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t(`account.docs.${doc.kind}`)}</p>
        <p className="text-sm text-ink-soft">
          {uploaded ? t('account.docUploaded') : t('account.docMissing')}
        </p>
      </div>
      {uploaded && (
        <button
          type="button"
          onClick={() => void view()}
          className="inline-flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-semibold hover:bg-paper"
        >
          <Eye className="size-4" aria-hidden />
          {t('account.view')}
        </button>
      )}
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-line px-4 py-2 text-sm font-semibold hover:border-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue"
      >
        {upload.isPending ? <Spinner /> : <Upload className="size-4" aria-hidden />}
        {uploaded ? t('account.replace') : t('account.upload')}
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={upload.isPending}
          onChange={(event) => {
            pick(event.target.files?.[0])
            event.target.value = '' // permite volver a elegir el mismo archivo
          }}
        />
      </label>
    </li>
  )
}
