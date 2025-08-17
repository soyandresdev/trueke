import { Banknote, MessageCircle, ShieldCheck, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const benefits = [
  { key: 'noHaggling', icon: ShieldCheck, color: 'bg-lime' },
  { key: 'pickup', icon: Truck, color: 'bg-pink' },
  { key: 'chat', icon: MessageCircle, color: 'bg-blue-soft' },
  { key: 'payment', icon: Banknote, color: 'bg-status-pickup' },
] as const

export function Benefits() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-4xl font-extrabold sm:text-5xl">{t('benefits.title')}</h2>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map(({ key, icon: Icon, color }) => (
          <li key={key} className="rounded-lg border-2 border-ink p-6">
            <span className={`inline-flex rounded-md p-2.5 text-ink ${color}`}>
              <Icon className="size-6" aria-hidden />
            </span>
            <h3 className="mt-4 text-xl font-bold">{t(`benefits.${key}.title`)}</h3>
            <p className="mt-2 text-ink-soft">{t(`benefits.${key}.text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
