import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { isLoggedIn } from '@/auth/store'

/** Rutas privadas: todo lo que cuelga de `_app/` exige sesión. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (!isLoggedIn()) throw redirect({ to: '/entrar', search: { redirect: location.href } })
  },
  component: Outlet,
})
