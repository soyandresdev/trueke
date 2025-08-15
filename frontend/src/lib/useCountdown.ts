import { useEffect, useState } from 'react'

/** Segundos que faltan hasta `deadline` (ms). Se actualiza cada segundo mientras quede tiempo. */
export function useCountdown(deadline: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (deadline === null) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= deadline) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [deadline])
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000))
}
