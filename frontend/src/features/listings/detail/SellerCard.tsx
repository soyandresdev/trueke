import { CircleAlert, CircleCheck, Eye, Mail, Phone } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'

import { openSellerDocument, useSeller } from '../api'

const documents = [
  { kind: 'document', has: 'has_document_file' },
  { kind: 'bank-certificate', has: 'has_bank_certificate' },
] as const

/** Ficha del vendedor para el operador: contacto, datos para pagarle y sus documentos privados. */
export function SellerCard({ sellerId }: { sellerId: number }) {
  const { t } = useTranslation()
  const { data: seller, isPending, isError } = useSeller(sellerId, true)
  const titleId = useId()

  if (isPending) return <Spinner className="size-5 text-blue" />
  if (isError) return <p className="text-sm text-ink-soft">{t('errors.generic')}</p>

  const name = `${seller.first_name ?? ''} ${seller.last_name ?? ''}`.trim()
  return (
    <section className="rounded-lg border border-line p-5" aria-labelledby={titleId}>
      <div className="flex items-center gap-3">
        <Avatar name={name} src={seller.photo} />
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-lg font-bold">
            {name || t('seller.noName')}
          </h2>
          <p
            className={`inline-flex items-center gap-1 text-sm ${seller.profile_complete ? 'text-lime-dark' : 'text-tomato'}`}
          >
            {seller.profile_complete ? (
              <CircleCheck className="size-4" aria-hidden />
            ) : (
              <CircleAlert className="size-4" aria-hidden />
            )}
            {seller.profile_complete ? t('seller.complete') : t('seller.incomplete')}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Phone className="size-4 text-muted" aria-hidden />
          <dt className="sr-only">{t('auth.phone')}</dt>
          <dd>
            <a href={`tel:${seller.phone}`} className="font-mono hover:text-blue">
              {seller.phone}
            </a>
          </dd>
        </div>
        {seller.email && (
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted" aria-hidden />
            <dt className="sr-only">{t('account.email')}</dt>
            <dd>
              <a href={`mailto:${seller.email}`} className="hover:text-blue">
                {seller.email}
              </a>
            </dd>
          </div>
        )}
        {seller.document_type && (
          <div className="flex gap-2">
            <dt className="text-muted">{t(`account.documentTypes.${seller.document_type}`)}</dt>
            <dd className="font-mono">{seller.document_number || '—'}</dd>
          </div>
        )}
      </dl>

      <ul className="mt-4 flex flex-wrap gap-2">
        {documents.map((doc) =>
          seller[doc.has] ? (
            <li key={doc.kind}>
              <button
                type="button"
                onClick={() => void openSellerDocument(sellerId, doc.kind)}
                className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-sm font-semibold hover:border-ink"
              >
                <Eye className="size-4" aria-hidden />
                {t(`account.docs.${doc.kind}`)}
              </button>
            </li>
          ) : (
            <li key={doc.kind} className="rounded-pill bg-paper px-3 py-1.5 text-sm text-muted">
              {t('seller.missing', { doc: t(`account.docs.${doc.kind}`) })}
            </li>
          ),
        )}
      </ul>
    </section>
  )
}
