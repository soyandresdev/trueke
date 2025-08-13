import type { ComponentProps } from 'react'

const variants = {
  primary: 'bg-blue text-white hover:bg-blue-dark',
  // "Sticker": solo para la acción principal de una pantalla.
  pop: 'bg-lime text-ink border-2 border-ink shadow-pop hover:-translate-x-px hover:-translate-y-px active:translate-0 active:shadow-none',
  ghost: 'text-ink hover:bg-paper',
} as const

type Props = ComponentProps<'button'> & { variant?: keyof typeof variants }

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-pill px-5 py-2.5 font-semibold transition disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
