/** Une clases de Tailwind ignorando las vacías: `cn('a', cond && 'b')`. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
