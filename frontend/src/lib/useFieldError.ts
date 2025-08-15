import { useTranslation } from 'react-i18next'

/**
 * Traduce el mensaje de error de un campo. Los de Zod son claves (`validation.phone`);
 * los del servidor ya vienen traducidos y se muestran tal cual.
 */
export function useFieldError() {
  const { t, i18n } = useTranslation()
  return (message: string | undefined) => {
    if (!message) return undefined
    return i18n.exists(message) ? t(message as 'validation.phone') : message
  }
}
