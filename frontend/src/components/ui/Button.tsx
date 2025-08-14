import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

import { Spinner } from './Spinner'

const variants = {
  primary: 'bg-blue text-white hover:bg-blue-dark',
  // "Sticker": solo para la acción principal de una pantalla (publicar, aceptar oferta).
  pop: 'border-2 border-ink bg-lime text-ink shadow-pop hover:-translate-x-px hover:-translate-y-px active:translate-0 active:shadow-none',
  secondary: 'border border-line bg-white text-ink hover:border-ink',
  ghost: 'text-ink hover:bg-paper',
  danger: 'bg-tomato text-ink hover:brightness-95',
} as const

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-11 px-5',
  lg: 'h-14 px-7 text-lg',
} as const

type Props = ComponentProps<'button'> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap transition',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
