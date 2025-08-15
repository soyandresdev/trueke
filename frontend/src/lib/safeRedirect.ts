/** Solo rutas internas: evita que `?redirect=https://otro.sitio` saque al usuario de la app. */
export function safeRedirect(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  ) {
    return undefined
  }
  return value
}
