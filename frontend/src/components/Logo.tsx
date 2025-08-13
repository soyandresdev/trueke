import logo from '../../../brand/logo/trueke-logo.svg'
import logoInverse from '../../../brand/logo/trueke-logo-inverso.svg'

type Props = { inverse?: boolean; className?: string }

export function Logo({ inverse = false, className }: Props) {
  return <img src={inverse ? logoInverse : logo} alt="Trueke" className={className} />
}
