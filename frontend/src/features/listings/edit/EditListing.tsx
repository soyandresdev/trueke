import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { applyApiErrors } from '@/api/errors'
import type { Category, Listing } from '@/api/types'
import { useMe } from '@/auth/session'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/toast'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

import { updateListing, useCategories, type ApiFailure } from '../api'
import { DetailsFields, PickupFields } from '../form/ListingFields'
import {
  attributesToForm,
  detailsShape,
  pickupShape,
  type DetailsFormValues,
  type PickupFormValues,
} from '../form/schemas'
import { emptyAttributes } from '../schemaFields'
import { PhotoManager } from './PhotoManager'

/** Editar una publicación: solo su vendedor y solo mientras está en revisión (el backend lo exige igual). */
export function EditListing({ listing }: { listing: Listing }) {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: categories } = useCategories()
  const category = categories?.find((item) => item.id === listing.category)

  const back = (
    <Link
      to="/publicaciones/$id"
      params={{ id: listing.id }}
      className="text-sm text-ink-soft hover:text-ink"
    >
      ← {listing.title}
    </Link>
  )

  if (me && (me.id !== listing.seller.id || listing.status !== 'in_review')) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {back}
        <p className="mt-6 text-ink-soft">{t('edit.notEditable')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {back}
      <h1 className="mt-4 text-4xl font-extrabold">{t('edit.title')}</h1>

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">{t('edit.photos')}</h2>
        <PhotoManager listing={listing} />
      </section>

      {category && <EditForm listing={listing} category={category} />}
    </div>
  )
}

function EditForm({ listing, category }: { listing: Listing; category: Category }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [general, setGeneral] = useState<string | null>(null)
  const { fields, shape } = detailsShape(category, i18n.language)
  const schema = z.object({ ...shape, ...pickupShape })
  type Values = DetailsFormValues & PickupFormValues
  const form = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      title: listing.title,
      description: listing.description,
      condition: listing.condition,
      // Campos nuevos de la categoría (añadidos en el admin después de publicar) quedan vacíos.
      attributes: { ...emptyAttributes(fields), ...attributesToForm(listing.attributes) },
      city: listing.city,
      pickup_address: listing.pickup_address,
      is_original: listing.is_original ?? true,
    },
  })

  const save = useMutation({
    mutationFn: (values: z.output<typeof schema>) => updateListing(listing.id, values),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.listing(listing.id), saved)
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings })
      toast.success(t('edit.saved'))
      void navigate({ to: '/publicaciones/$id', params: { id: listing.id } })
    },
    onError: (failure: ApiFailure) => {
      const fieldNames = ['title', 'description', 'condition', 'city', 'pickup_address'] as const
      setGeneral(applyApiErrors(failure.body, form.setError, fieldNames) ?? t('errors.generic'))
    },
  })

  return (
    <form
      noValidate
      className="mt-12 flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) => {
        setGeneral(null)
        save.mutate(values)
      })}
    >
      <h2 className="text-2xl font-bold">{t('edit.details')}</h2>
      <DetailsFields
        register={form.register}
        errors={form.formState.errors}
        category={category}
        fields={fields}
      />
      <h2 className="mt-6 text-2xl font-bold">{t('edit.pickup')}</h2>
      <PickupFields register={form.register} errors={form.formState.errors} />
      {general && (
        <p className="text-sm text-tomato" role="alert">
          {general}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-3 border-t border-line pt-6">
        <Button
          variant="ghost"
          onClick={() => void navigate({ to: '/publicaciones/$id', params: { id: listing.id } })}
        >
          {t('edit.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
          {t('ui.save')}
        </Button>
      </div>
    </form>
  )
}
