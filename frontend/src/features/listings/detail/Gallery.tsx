import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Listing } from '@/api/types'
import { cn } from '@/lib/cn'

export function Gallery({ listing }: { listing: Listing }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const images = listing.images
  // Si se borra una foto, el índice elegido puede quedar fuera: se muestra la primera.
  const current = images[selected] ?? images[0]

  if (!current) return <div className="aspect-4/3 rounded-lg bg-paper" />
  return (
    <div>
      <img
        src={current.image}
        alt={listing.title}
        className="aspect-4/3 w-full rounded-lg bg-paper object-cover"
      />
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={t('wizard.photoAlt', { n: index + 1 })}
                aria-current={image.id === current.id}
                className={cn(
                  'block size-16 overflow-hidden rounded-md border-2',
                  image.id === current.id ? 'border-blue' : 'border-transparent',
                )}
              >
                <img src={image.image} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
