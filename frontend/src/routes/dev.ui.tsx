import { createFileRoute, notFound } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'

import type { ListingStatus } from '@/api/types'
import { ListingCard } from '@/components/ListingCard'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Checkbox, SelectField, TextArea, TextField } from '@/components/ui/fields'
import { Modal } from '@/components/ui/Modal'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Ticket } from '@/components/ui/Ticket'
import { toast } from '@/components/ui/toast'

import bike from '../../../brand/images/demo-bici-ruta.jpg'
import camera from '../../../brand/images/demo-mirrorless.jpg'
import guitar from '../../../brand/images/demo-guitarra.jpg'

// Catálogo interno de componentes. Solo existe en desarrollo.
export const Route = createFileRoute('/dev/ui')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: DesignSystem,
})

const statuses: ListingStatus[] = [
  'in_review',
  'offered',
  'accepted',
  'pickup_sent',
  'completed',
  'cancelled',
]
const colors = [
  'ink',
  'ink-soft',
  'muted',
  'line',
  'paper',
  'blue',
  'blue-dark',
  'blue-soft',
  'lime',
  'lime-dark',
  'pink',
  'tomato',
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="mb-6 font-mono text-sm tracking-widest text-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}

function DesignSystem() {
  const [modalOpen, setModalOpen] = useState(false)
  const [bell, setBell] = useState(3)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <h1 className="pt-8 pb-10 text-5xl font-extrabold">Sistema de diseño</h1>

      <Section title="Color">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {colors.map((color) => (
            <div key={color}>
              <div
                className="h-16 rounded-md border border-line"
                style={{ background: `var(--color-${color})` }}
              />
              <p className="mt-1 font-mono text-xs">{color}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <p className="font-display text-6xl font-extrabold">Gabarito 800</p>
        <p className="font-display text-3xl font-bold">Gabarito 700 · títulos y cifras</p>
        <p className="mt-4 text-lg">
          Instrument Sans · interfaz y texto corrido, legible en tamaños pequeños.
        </p>
        <p className="mt-2 font-mono">Geist Mono · TK-000123 · 19/09/2026</p>
      </Section>

      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="pop" size="lg">
            Publicar artículo
          </Button>
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="danger">Cancelar publicación</Button>
          <Button loading>Guardando</Button>
          <Button disabled>Deshabilitado</Button>
          <Button size="sm">Pequeño</Button>
        </div>
      </Section>

      <Section title="Campos">
        <form
          className="grid max-w-2xl gap-5 sm:grid-cols-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <TextField
            label="Nombre del artículo"
            placeholder="Guitarra acústica"
            hint="Máximo 120 caracteres."
          />
          <TextField
            label="Teléfono"
            defaultValue="300 12"
            error="Número incompleto."
            inputMode="tel"
          />
          <SelectField label="Estado del artículo" defaultValue="good">
            <option value="like_new">Como nuevo</option>
            <option value="good">Buen estado</option>
            <option value="fair">Con detalles</option>
          </SelectField>
          <TextField label="Ciudad" disabled defaultValue="Bogotá" />
          <div className="sm:col-span-2">
            <TextArea label="Descripción" placeholder="Cuéntanos cómo está, qué incluye…" />
          </div>
          <div className="sm:col-span-2">
            <Checkbox label="Acepto los términos y condiciones" />
          </div>
        </form>
      </Section>

      <Section title="Estado de una publicación">
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Ticket de la oferta">
        <div className="flex flex-wrap gap-8">
          <Ticket listingId={123} title="Bicicleta de ruta talla M" amount="1900000" />
          <Ticket
            listingId={7}
            title="Lente 50 mm f/1.8"
            amount={850000}
            label="Venta completada"
          />
        </div>
      </Section>

      <Section title="Tarjetas">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ListingCard
            id={12}
            title="Bicicleta de ruta talla M"
            image={bike}
            status="accepted"
            city="Bogotá"
            offer="1900000"
            unreadMessages={2}
          />
          <ListingCard
            id={4}
            title="Cámara mirrorless con lente kit"
            image={camera}
            status="in_review"
            city="Bogotá"
          />
          <ListingCard
            id={9}
            title="Guitarra acústica"
            image={guitar}
            status="pickup_sent"
            city="Medellín"
            offer="420000"
          />
        </div>
      </Section>

      <Section title="Avatar y campana">
        <div className="flex items-center gap-4">
          <Avatar name="Laura Gómez" size="lg" />
          <Avatar name="Mateo Rojas" />
          <Avatar name="Sara Operadora" size="sm" />
          <NotificationBell count={bell} onClick={() => setBell(0)} />
          <NotificationBell count={27} />
        </div>
      </Section>

      <Section title="Modal y avisos">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Oferta aceptada')}>
            Aviso de éxito
          </Button>
          <Button variant="secondary" onClick={() => toast.error('No se pudo subir la foto')}>
            Aviso de error
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Tienes un mensaje nuevo')}>
            Aviso informativo
          </Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="¿Rechazar la oferta?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Volver
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>
                Rechazar
              </Button>
            </>
          }
        >
          <p className="text-ink-soft">
            La publicación se cancelará y no podrás recuperar esta oferta.
          </p>
        </Modal>
      </Section>
    </div>
  )
}
