import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'

import { Avatar } from './Avatar'
import { Button } from './Button'
import { Checkbox, TextField } from './fields'
import { Modal } from './Modal'
import { NotificationBell } from './NotificationBell'
import { StatusBadge } from './StatusBadge'
import { Ticket } from './Ticket'
import { toast, useToasts } from './toast'
import { Toaster } from './Toaster'

beforeEach(async () => {
  await i18n.changeLanguage('es')
})

describe('Button', () => {
  it('en carga queda deshabilitado y lo anuncia', () => {
    render(<Button loading>Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('es type="button" por defecto para no enviar formularios sin querer', () => {
    render(<Button>Otro</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('campos', () => {
  it('enlaza etiqueta, ayuda y error', () => {
    const { rerender } = render(<TextField label="Ciudad" hint="Donde recogemos" />)
    const input = screen.getByLabelText('Ciudad')
    expect(input).toHaveAccessibleDescription('Donde recogemos')
    expect(input).not.toHaveAttribute('aria-invalid')

    rerender(<TextField label="Ciudad" hint="Donde recogemos" error="Obligatorio" />)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Obligatorio')
  })

  it('la casilla se marca haciendo clic en su texto', async () => {
    render(<Checkbox label="Acepto los términos" />)
    await userEvent.click(screen.getByText('Acepto los términos'))
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})

describe('StatusBadge', () => {
  it('traduce el estado', async () => {
    const { rerender } = render(<StatusBadge status="pickup_sent" />)
    expect(screen.getByText('Recogida enviada')).toBeInTheDocument()
    await act(() => i18n.changeLanguage('en'))
    rerender(<StatusBadge status="pickup_sent" />)
    expect(screen.getByText('Pickup scheduled')).toBeInTheDocument()
  })
})

describe('Ticket', () => {
  it('muestra la cifra formateada, el título y el código', () => {
    render(<Ticket listingId={42} title="Guitarra" amount="420000.00" />)
    expect(screen.getByText('TK-000042')).toBeInTheDocument()
    expect(screen.getByRole('figure')).toHaveTextContent(/420\.000/)
    expect(screen.getByRole('figure')).toHaveTextContent('Te ofrecemos')
  })
})

describe('Avatar', () => {
  it('sin nombre muestra un icono, no una inicial rara', () => {
    const { container } = render(<Avatar name="" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container).toHaveTextContent('')
  })

  it('usa las iniciales si no hay foto', () => {
    render(<Avatar name="laura gómez ruiz" />)
    expect(screen.getByRole('img', { name: 'laura gómez ruiz' })).toHaveTextContent('LG')
  })
})

describe('NotificationBell', () => {
  it('anuncia el número y recorta a 9+', () => {
    render(<NotificationBell count={12} />)
    expect(screen.getByRole('button', { name: 'Notificaciones: 12 sin ver' })).toHaveTextContent(
      '9+',
    )
  })

  it('sin avisos no muestra contador', () => {
    render(<NotificationBell count={0} />)
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toHaveTextContent('')
  })
})

describe('Modal', () => {
  it('se abre y se cierra con la prop y con la X', async () => {
    const onClose = vi.fn<() => void>()
    const { rerender } = render(
      <Modal open={false} onClose={onClose} title="¿Seguro?">
        Texto
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(
      <Modal open onClose={onClose} title="¿Seguro?">
        Texto
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: '¿Seguro?' })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('toasts', () => {
  beforeEach(() => useToasts.setState({ toasts: [] }))

  it('se muestran y desaparecen solos', () => {
    vi.useFakeTimers()
    render(<Toaster />)
    act(() => toast.error('No se pudo guardar'))
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar')
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('como máximo tres a la vez', () => {
    for (const message of ['1', '2', '3', '4']) toast.info(message)
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual(['2', '3', '4'])
  })
})
