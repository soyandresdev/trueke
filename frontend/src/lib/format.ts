import i18n from '@/i18n'

const locale = () => (i18n.language === 'en' ? 'en-US' : 'es-CO')

/** `450000` → `$ 450.000` (sin decimales si no los hay). */
export function formatMoney(amount: number | string, currency = 'COP') {
  const value = typeof amount === 'string' ? Number(amount) : amount
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  return new Intl.DateTimeFormat(locale(), options).format(new Date(value))
}

/** Código visible de una publicación, el que va impreso en el ticket: `TK-000123`. */
export function ticketCode(id: number) {
  return `TK-${String(id).padStart(6, '0')}`
}
