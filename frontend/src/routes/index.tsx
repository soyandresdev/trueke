import { createFileRoute } from '@tanstack/react-router'

import { Benefits } from '@/features/landing/Benefits'
import { Categories } from '@/features/landing/Categories'
import { Faq } from '@/features/landing/Faq'
import { Hero } from '@/features/landing/Hero'
import { HowItWorks } from '@/features/landing/HowItWorks'
import { Newsletter } from '@/features/landing/Newsletter'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Categories />
      <Benefits />
      <Faq />
      <Newsletter />
    </>
  )
}
