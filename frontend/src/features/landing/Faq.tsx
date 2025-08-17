import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const questions = ['what', 'price', 'time', 'payment', 'documents', 'cancel'] as const

/** Preguntas frecuentes con <details>: abren y cierran sin JavaScript y son accesibles de serie. */
export function Faq() {
  const { t } = useTranslation()
  return (
    <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-8 px-4 py-20">
      <h2 className="text-4xl font-extrabold sm:text-5xl">{t('faq.title')}</h2>
      <div className="mt-10 divide-y divide-line border-y border-line">
        {questions.map((key) => (
          <details key={key} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {t(`faq.${key}.q`)}
              <Plus className="size-5 shrink-0 transition group-open:rotate-45" aria-hidden />
            </summary>
            <p className="mt-3 text-ink-soft">{t(`faq.${key}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
