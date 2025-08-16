import { createFileRoute } from '@tanstack/react-router'

import { NewListingWizard } from '@/features/listings/wizard/NewListingWizard'

export const Route = createFileRoute('/_app/publicaciones/nueva')({ component: NewListingWizard })
