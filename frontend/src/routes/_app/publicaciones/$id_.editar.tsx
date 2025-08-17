import { createFileRoute, notFound } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/Spinner'
import { useListing, type ApiFailure } from '@/features/listings/api'
import { EditListing } from '@/features/listings/edit/EditListing'

// `$id_` (con guion bajo): misma URL /publicaciones/:id/editar, pero no se pinta dentro del detalle.
export const Route = createFileRoute('/_app/publicaciones/$id_/editar')({
  params: {
    parse: ({ id }) => {
      if (!/^\d+$/.test(id)) throw notFound()
      return { id: Number(id) }
    },
    stringify: ({ id }) => ({ id: String(id) }),
  },
  component: EditPage,
})

function EditPage() {
  const { t } = useTranslation()
  const { id } = Route.useParams()
  const listing = useListing(id)
  if (listing.isPending) return <Spinner className="mx-auto mt-24 block size-6 text-blue" />
  if (listing.isError) {
    const missing = (listing.error as unknown as ApiFailure).status === 404
    return (
      <p className="mx-auto max-w-3xl px-4 py-16 text-ink-soft">
        {missing ? t('notFound') : t('errors.generic')}
      </p>
    )
  }
  return <EditListing listing={listing.data} />
}
