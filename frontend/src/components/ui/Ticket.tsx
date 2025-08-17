import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { formatMoney, ticketCode } from '@/lib/format'

type Props = {
  listingId: number
  title: string
  amount: number | string
  currency?: string
  /** Texto pequeño sobre la cifra; por defecto "Te ofrecemos". */
  label?: string
  className?: string
}

/**
 * La oferta como un ticket: cuerpo azul con la cifra, línea troquelada y talón lima con el código.
 * Repite la forma del símbolo del logo (brand/logo/trueke-simbolo.svg).
 */
export function Ticket({ listingId, title, amount, currency, label, className }: Props) {
  const { t } = useTranslation()
  const text = label ?? t('ticket.label')
  const money = formatMoney(amount, currency)
  return (
    // La sombra va fuera: la máscara de las muescas también recortaría la sombra.
    <figure
      className={cn('w-full max-w-md drop-shadow-[0_12px_20px_rgb(43_75_255/0.28)]', className)}
    >
      <div className="ticket flex overflow-hidden rounded-lg">
        <div className="@container flex min-w-0 flex-1 flex-col justify-between gap-8 bg-blue p-5 text-white">
          <p className="font-mono text-xs tracking-widest text-blue-soft uppercase">{text}</p>
          <div>
            {/* El tamaño de la cifra depende del ancho del ticket, no de la pantalla: nunca se corta. */}
            <p className="font-display text-2xl leading-none font-extrabold whitespace-nowrap tabular-nums @[13rem]:text-3xl @[16rem]:text-4xl @[19rem]:text-5xl">
              {money}
            </p>
            <p className="mt-2 truncate text-sm text-blue-soft">{title}</p>
          </div>
        </div>
        <div className="flex w-(--cut) shrink-0 flex-col items-center justify-between gap-3 border-l-2 border-dashed border-white bg-lime p-4 text-ink">
          <Barcode seed={listingId} />
          <p className="font-mono text-[0.7rem] font-medium tracking-wider [writing-mode:vertical-rl]">
            {ticketCode(listingId)}
          </p>
        </div>
      </div>
      <figcaption className="sr-only">{`${text}: ${money} · ${title}`}</figcaption>
    </figure>
  )
}

/** Código de barras decorativo y estable: el mismo id siempre da las mismas barras. */
function Barcode({ seed }: { seed: number }) {
  const bars: { x: number; width: number }[] = []
  let value = seed
  let x = 0
  for (let i = 0; i < 18; i++) {
    value = (value * 9301 + 49297) % 233280
    const width = 1 + (value % 3)
    bars.push({ x, width })
    x += width + 1.5
  }
  return (
    <svg viewBox={`0 0 ${x} 40`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} width={bar.width} height="40" fill="currentColor" />
      ))}
    </svg>
  )
}
