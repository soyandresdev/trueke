import { useMutation } from '@tanstack/react-query'
import { ImagePlus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Listing } from '@/api/types'
import { Spinner } from '@/components/ui/Spinner'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/realtime/events'

import { deleteListingImage, uploadListingImage } from '../api'
import { MAX_PHOTO_MB, MAX_PHOTOS, PHOTO_TYPES } from '../wizard/photoRules'

/** Fotos de una publicación existente: cada cambio se guarda al momento. Siempre queda al menos una. */
export function PhotoManager({ listing }: { listing: Listing }) {
  const { t } = useTranslation()
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)
  const images = listing.images
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.listing(listing.id) })

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const start = images.length ? Math.max(...images.map((image) => image.position ?? 0)) + 1 : 0
      let failed = 0
      for (const [index, file] of files.entries()) {
        await uploadListingImage(listing.id, file, start + index).catch(() => failed++)
      }
      if (failed) throw new Error(String(failed))
    },
    onError: () => setError(t('edit.uploadFailed')),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: (imageId: number) => deleteListingImage(listing.id, imageId),
    onError: () => setError(t('errors.generic')),
    onSettled: refresh,
  })

  const add = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    const valid = files.filter(
      (file) => PHOTO_TYPES.includes(file.type) && file.size <= MAX_PHOTO_MB * 1024 * 1024,
    )
    const room = MAX_PHOTOS - images.length
    setError(
      valid.length < files.length
        ? t('wizard.photosRejected', { mb: MAX_PHOTO_MB })
        : valid.length > room
          ? t('wizard.photosMax', { max: MAX_PHOTOS })
          : null,
    )
    if (valid.length && room > 0) upload.mutate(valid.slice(0, room))
  }

  const busy = upload.isPending || remove.isPending
  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy={busy}>
        {images.map((image, index) => (
          <li key={image.id} className="relative aspect-square overflow-hidden rounded-md bg-paper">
            <img
              src={image.image}
              alt={t('wizard.photoAlt', { n: index + 1 })}
              className="size-full object-cover"
            />
            {index === 0 && (
              <span className="absolute bottom-2 left-2 rounded-pill bg-ink px-2 py-0.5 font-mono text-[0.65rem] text-white uppercase">
                {t('wizard.cover')}
              </span>
            )}
            {images.length > 1 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null)
                  remove.mutate(image.id)
                }}
                className="absolute top-2 right-2 rounded-full bg-white/90 p-1 hover:bg-white disabled:opacity-50"
                aria-label={t('wizard.removePhoto', { n: index + 1 })}
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
        {images.length < MAX_PHOTOS && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line text-sm font-semibold text-ink-soft transition hover:border-blue hover:text-blue has-[:focus-visible]:border-blue"
            >
              {upload.isPending ? (
                <Spinner className="size-6" />
              ) : (
                <ImagePlus className="size-7" aria-hidden />
              )}
              {t('wizard.addPhotos')}
              <input
                id={inputId}
                type="file"
                accept={PHOTO_TYPES.join(',')}
                multiple
                disabled={busy}
                className="sr-only"
                onChange={(event) => {
                  add(event.target.files)
                  event.target.value = ''
                }}
              />
            </label>
          </li>
        )}
      </ul>
      <p className="mt-2 text-sm text-muted">{t('edit.photosHint')}</p>
      {error && (
        <p className="mt-2 text-sm text-tomato" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
