import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Category } from '@/api/types'
import { toast } from '@/components/ui/toast'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

import { createListing, uploadListingImage, type ApiFailure } from '../api'
import { CategoryStep } from './CategoryStep'
import { DetailsStep, type Details } from './DetailsStep'
import { PhotosStep, type Photo } from './PhotosStep'
import { PickupStep, type Pickup } from './PickupStep'

const steps = ['category', 'details', 'photos', 'pickup'] as const

/** Crear publicación: categoría → detalles (con los campos de la categoría) → fotos → recogida y términos. */
export function NewListingWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<Category | null>(null)
  const [details, setDetails] = useState<Details | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [error, setError] = useState<string | null>(null)

  // Las vistas previas de las fotos se liberan al salir del asistente (no al cambiar de paso).
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  })
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), [])

  const publish = useMutation({
    mutationFn: async (pickup: Pickup) => {
      const listing = await createListing({
        category: category!.id,
        ...details!.values,
        ...pickup,
        terms_accepted: true,
      })
      // Las fotos se suben una a una, en orden. Si alguna falla, la publicación ya existe:
      // se avisa y se pueden añadir después desde el detalle.
      let failed = 0
      for (const [position, photo] of photos.entries()) {
        await uploadListingImage(listing.id, photo.file, position).catch(() => failed++)
      }
      return { listing, failed }
    },
    onSuccess: ({ listing, failed }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings })
      if (failed) toast.error(t('wizard.photosFailed', { count: failed }))
      else toast.success(t('wizard.published'))
      void navigate({ to: '/publicaciones/$id', params: { id: listing.id }, replace: true })
    },
    onError: (failure: ApiFailure) => {
      const messages = Object.entries(failure.body ?? {}).flatMap(([, value]) =>
        Array.isArray(value)
          ? value.map(String)
          : typeof value === 'object' && value
            ? Object.values(value).flat().map(String)
            : [String(value)],
      )
      setError(messages.join(' ') || t('errors.generic'))
    },
  })

  const next = () => setStep((current) => Math.min(current + 1, steps.length - 1))
  const back = () => setStep((current) => Math.max(current - 1, 0))

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-sm text-muted">
        {t('wizard.step', { current: step + 1, total: steps.length })}
      </p>
      <h1 className="mt-1 text-4xl font-extrabold">{t(`wizard.titles.${steps[step]!}`)}</h1>
      <ol className="mt-5 grid grid-cols-4 gap-2" aria-hidden>
        {steps.map((name, index) => (
          <li
            key={name}
            className={`h-1.5 rounded-pill ${index <= step ? 'bg-blue' : 'bg-line'}`}
          />
        ))}
      </ol>

      <div className="mt-8">
        {step === 0 && (
          <CategoryStep
            selected={category?.id}
            onSelect={(value) => {
              // Otra categoría tiene otros campos: los detalles anteriores ya no sirven.
              if (value.id !== category?.id) setDetails(null)
              setCategory(value)
              next()
            }}
          />
        )}
        {step === 1 && category && (
          <DetailsStep
            category={category}
            defaultValues={details}
            onBack={back}
            onNext={(values) => {
              setDetails(values)
              next()
            }}
          />
        )}
        {step === 2 && (
          <PhotosStep photos={photos} onChange={setPhotos} onBack={back} onNext={next} />
        )}
        {step === 3 && (
          <PickupStep
            onBack={back}
            submitting={publish.isPending}
            error={error}
            onSubmit={(pickup) => {
              setError(null)
              publish.mutate(pickup)
            }}
          />
        )}
      </div>
    </div>
  )
}
