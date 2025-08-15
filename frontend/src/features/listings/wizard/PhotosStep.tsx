import { ImagePlus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StepNav } from './DetailsStep'
import { MAX_PHOTO_MB, MAX_PHOTOS, PHOTO_TYPES } from './photoRules'

export type Photo = { id: string; file: File; url: string }

type Props = {
  photos: Photo[]
  onChange: (photos: Photo[]) => void
  onBack: () => void
  onNext: () => void
}

export function PhotosStep({ photos, onChange, onBack, onNext }: Props) {
  const { t } = useTranslation()
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)

  const add = (files: FileList | null) => {
    const accepted: Photo[] = []
    let rejected = 0
    for (const file of Array.from(files ?? [])) {
      if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_MB * 1024 * 1024) rejected++
      else accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })
    }
    const room = MAX_PHOTOS - photos.length
    accepted.slice(room).forEach((photo) => URL.revokeObjectURL(photo.url))
    onChange([...photos, ...accepted.slice(0, room)])
    setError(
      rejected
        ? t('wizard.photosRejected', { mb: MAX_PHOTO_MB })
        : accepted.length > room
          ? t('wizard.photosMax', { max: MAX_PHOTOS })
          : null,
    )
  }

  const remove = (photo: Photo) => {
    URL.revokeObjectURL(photo.url)
    onChange(photos.filter((item) => item.id !== photo.id))
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (photos.length === 0) return setError(t('wizard.photosRequired'))
        onNext()
      }}
    >
      <p className="text-ink-soft">{t('wizard.photosLead', { max: MAX_PHOTOS })}</p>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id} className="relative aspect-square overflow-hidden rounded-md bg-paper">
            <img
              src={photo.url}
              alt={t('wizard.photoAlt', { n: index + 1 })}
              className="size-full object-cover"
            />
            {index === 0 && (
              <span className="absolute bottom-2 left-2 rounded-pill bg-ink px-2 py-0.5 font-mono text-[0.65rem] text-white uppercase">
                {t('wizard.cover')}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(photo)}
              className="absolute top-2 right-2 rounded-full bg-white/90 p-1 hover:bg-white"
              aria-label={t('wizard.removePhoto', { n: index + 1 })}
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {photos.length < MAX_PHOTOS && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line text-sm font-semibold text-ink-soft transition hover:border-blue hover:text-blue has-[:focus-visible]:border-blue"
            >
              <ImagePlus className="size-7" aria-hidden />
              {t('wizard.addPhotos')}
              <input
                id={inputId}
                type="file"
                accept={PHOTO_TYPES.join(',')}
                multiple
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
      {error && (
        <p className="mt-3 text-sm text-tomato" role="alert">
          {error}
        </p>
      )}
      <StepNav onBack={onBack} />
    </form>
  )
}
