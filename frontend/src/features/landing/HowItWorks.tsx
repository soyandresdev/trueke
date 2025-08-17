import { useTranslation } from 'react-i18next'

import { landingImages } from './images'

const steps = ['publish', 'offer', 'pickup'] as const

export function HowItWorks() {
  const { t } = useTranslation()
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-20">
      <h2 className="text-4xl font-extrabold sm:text-5xl">{t('how.title')}</h2>
      <ol className="mt-10 grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step}>
            <img
              src={landingImages.steps[index]}
              alt=""
              className="aspect-square w-full rounded-lg object-cover"
              loading="lazy"
            />
            <p className="mt-5 font-mono text-sm text-blue">0{index + 1}</p>
            <h3 className="mt-1 text-2xl font-bold">{t(`how.${step}.title`)}</h3>
            <p className="mt-2 text-ink-soft">{t(`how.${step}.text`)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
