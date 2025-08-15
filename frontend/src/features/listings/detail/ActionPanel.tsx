import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import type { Listing, ListingAction } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { SelectField, TextArea, TextField } from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { Ticket } from '@/components/ui/Ticket'
import { toast } from '@/components/ui/toast'
import { useFieldError } from '@/lib/useFieldError'

import { useTransition, type ApiFailure } from '../api'

// Orden y estilo de los botones: la acción que hace avanzar la venta va primero y destacada.
const order: ListingAction[] = ['offer', 'accept', 'pickup', 'complete', 'reject', 'cancel']
const variants = {
  offer: 'pop',
  accept: 'pop',
  pickup: 'primary',
  complete: 'primary',
  reject: 'secondary',
  cancel: 'ghost',
} as const

export function ActionPanel({ listing }: { listing: Listing }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<ListingAction | null>(null)
  const actions = order.filter((action) => listing.available_actions.includes(action))
  if (actions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button key={action} variant={variants[action]} onClick={() => setOpen(action)}>
          {t(`actions.${action}.button`)}
        </Button>
      ))}
      {open && <ActionModal listing={listing} action={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function ActionModal({
  listing,
  action,
  onClose,
}: {
  listing: Listing
  action: ListingAction
  onClose: () => void
}) {
  const { t } = useTranslation()
  const transition = useTransition(listing.id)
  const [failure, setFailure] = useState<ApiFailure | null>(null)

  const run = (body: object) => {
    setFailure(null)
    transition.mutate({ action, body } as never, {
      onSuccess: () => {
        toast.success(t(`actions.${action}.done`))
        onClose()
      },
      onError: setFailure,
    })
  }

  const error = failure && <ActionError failure={failure} />
  const props = { listing, run, pending: transition.isPending, error, onClose }
  return (
    <Modal open onClose={onClose} title={t(`actions.${action}.title`)}>
      {action === 'offer' && <OfferForm {...props} />}
      {action === 'pickup' && <PickupForm {...props} />}
      {(action === 'reject' || action === 'cancel') && <ReasonForm {...props} action={action} />}
      {(action === 'accept' || action === 'complete') && <Confirm {...props} action={action} />}
    </Modal>
  )
}

function ActionError({ failure }: { failure: ApiFailure }) {
  const { t } = useTranslation()
  const detail = typeof failure.body.detail === 'string' ? failure.body.detail : t('errors.generic')
  return (
    <p className="text-sm text-tomato" role="alert">
      {detail}{' '}
      {failure.body.code === 'profile_incomplete' && (
        <Link to="/cuenta" className="font-semibold underline">
          {t('actions.accept.completeProfile')}
        </Link>
      )}
    </p>
  )
}

type FormProps = {
  listing: Listing
  run: (body: object) => void
  pending: boolean
  error: ReactNode
  onClose: () => void
}

function Footer({
  pending,
  onClose,
  label,
  danger,
}: {
  pending: boolean
  onClose: () => void
  label: string
  danger?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-2 flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} disabled={pending}>
        {t('wizard.back')}
      </Button>
      <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={pending}>
        {label}
      </Button>
    </div>
  )
}

const offerSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, 'validation.amount')
    .transform((value) => value.replace(',', '.'))
    .refine((value) => Number(value) > 0, 'validation.amount'),
})

function OfferForm({ listing, run, pending, error, onClose }: FormProps) {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  const form = useForm({ resolver: zodResolver(offerSchema), defaultValues: { amount: '' } })
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(({ amount }) =>
        run({ amount, currency: listing.offer_currency || 'COP' }),
      )}
    >
      <p className="text-ink-soft">{t('actions.offer.lead', { title: listing.title })}</p>
      <TextField
        label={t('actions.offer.amount')}
        inputMode="decimal"
        placeholder="450000"
        autoFocus
        error={fieldError(form.formState.errors.amount?.message)}
        {...form.register('amount')}
      />
      {error}
      <Footer pending={pending} onClose={onClose} label={t('actions.offer.confirm')} />
    </form>
  )
}

const pickupSchema = z.object({
  pickup_by: z.enum(['platform', 'seller']),
  pickup_date: z.string().transform((value) => value || null),
  notes: z.string().trim().max(500, 'validation.maxLength'),
})

function PickupForm({ run, pending, error, onClose }: FormProps) {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  const form = useForm({
    resolver: zodResolver(pickupSchema),
    defaultValues: { pickup_by: 'platform' as const, pickup_date: '', notes: '' },
  })
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit(run)}>
      <SelectField label={t('actions.pickup.by')} {...form.register('pickup_by')}>
        <option value="platform">{t('pickupBy.platform')}</option>
        <option value="seller">{t('pickupBy.seller')}</option>
      </SelectField>
      <TextField
        label={t('actions.pickup.date')}
        type="date"
        hint={t('ui.optional')}
        {...form.register('pickup_date')}
      />
      <TextArea
        label={t('actions.pickup.notes')}
        rows={3}
        hint={t('ui.optional')}
        error={fieldError(form.formState.errors.notes?.message)}
        {...form.register('notes')}
      />
      {error}
      <Footer pending={pending} onClose={onClose} label={t('actions.pickup.confirm')} />
    </form>
  )
}

function ReasonForm({
  run,
  pending,
  error,
  onClose,
  action,
}: FormProps & { action: 'reject' | 'cancel' }) {
  const { t } = useTranslation()
  const form = useForm({ defaultValues: { reason: '' } })
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(({ reason }) => run({ reason: reason.trim() }))}
    >
      <p className="text-ink-soft">{t(`actions.${action}.lead`)}</p>
      <TextArea
        label={t('actions.reason')}
        rows={3}
        maxLength={500}
        hint={t('ui.optional')}
        {...form.register('reason')}
      />
      {error}
      <Footer pending={pending} onClose={onClose} label={t(`actions.${action}.confirm`)} danger />
    </form>
  )
}

function Confirm({
  listing,
  run,
  pending,
  error,
  onClose,
  action,
}: FormProps & { action: 'accept' | 'complete' }) {
  const { t } = useTranslation()
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        run({})
      }}
    >
      {action === 'accept' && listing.offer_amount && (
        <Ticket
          listingId={listing.id}
          title={listing.title}
          amount={listing.offer_amount}
          currency={listing.offer_currency || undefined}
        />
      )}
      <p className="text-ink-soft">{t(`actions.${action}.lead`)}</p>
      {error}
      <Footer pending={pending} onClose={onClose} label={t(`actions.${action}.confirm`)} />
    </form>
  )
}
