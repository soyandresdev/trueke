import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'

export function StepNav({
  onBack,
  submitLabel,
  submitting,
}: {
  onBack?: () => void
  submitLabel?: string
  submitting?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-6">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          {t('wizard.back')}
        </Button>
      ) : (
        <span />
      )}
      <Button
        type="submit"
        variant={submitLabel ? 'pop' : 'primary'}
        size={submitLabel ? 'lg' : 'md'}
        loading={submitting}
      >
        {submitLabel ?? t('wizard.next')}
      </Button>
    </div>
  )
}
