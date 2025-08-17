import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { terms } from '@/features/terms/content'

export const Route = createFileRoute('/terminos')({ component: Terms })

function Terms() {
  const { t, i18n } = useTranslation()
  const content = terms[i18n.resolvedLanguage === 'en' ? 'en' : 'es']
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-5xl font-extrabold">{t('terms.title')}</h1>
      <p className="mt-3 font-mono text-sm text-muted">{content.updated}</p>
      <p className="mt-6 rounded-lg bg-lime-soft p-4 text-sm">{content.notice}</p>
      {content.sections.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="text-2xl font-bold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-ink-soft">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  )
}
