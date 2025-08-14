import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { isLoggedIn } from '@/auth/store'
import { LoginFlow } from '@/features/auth/LoginFlow'
import { safeRedirect } from '@/lib/safeRedirect'

import authImage from '../../../brand/images/auth.jpg'

export const Route = createFileRoute('/entrar')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    if (isLoggedIn()) throw redirect({ to: search.redirect ?? '/cuenta' })
  },
  component: Login,
})

function Login() {
  const { redirect: next } = Route.useSearch()
  const navigate = useNavigate()
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
      <div className="mx-auto w-full max-w-sm md:mx-0 md:self-center">
        <LoginFlow
          onDone={({ user }) =>
            // Si le falta el perfil, primero "Mi cuenta"; si venía de otra página, vuelve a ella.
            void navigate({ to: next ?? (user.profile_complete ? '/' : '/cuenta'), replace: true })
          }
        />
      </div>
      <img
        src={authImage}
        alt=""
        className="hidden aspect-4/5 w-full rounded-lg object-cover md:block"
      />
    </div>
  )
}
