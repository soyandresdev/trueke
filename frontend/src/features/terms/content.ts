/**
 * Términos de uso de ejemplo. Trueke es un proyecto open source: quien lo despliegue debe
 * revisarlos con asesoría legal y adaptarlos a su país antes de usarlos con usuarios reales.
 */
type Section = { title: string; paragraphs: string[] }

export const terms: Record<'es' | 'en', { updated: string; notice: string; sections: Section[] }> =
  {
    es: {
      updated: 'Última actualización: 19 de septiembre de 2026',
      notice:
        'Plantilla de ejemplo del proyecto open source Trueke. Si vas a operar la plataforma con usuarios reales, revísala con asesoría legal y adáptala a tu país.',
      sections: [
        {
          title: 'Qué es Trueke',
          paragraphs: [
            'Trueke compra artículos usados a personas que ya no los usan. Tú publicas el artículo, nuestro equipo lo revisa y, si nos interesa, te hacemos una oferta. No es un marketplace entre particulares: el comprador es Trueke.',
          ],
        },
        {
          title: 'Quién puede vender',
          paragraphs: [
            'Personas mayores de edad que sean propietarias del artículo. Para recibir el pago necesitamos tus datos personales, un documento de identidad y un certificado bancario a tu nombre.',
          ],
        },
        {
          title: 'Tus publicaciones',
          paragraphs: [
            'Describe el artículo tal como está: estado real, detalles, golpes y lo que incluye. Indica si es original; no compramos réplicas ni artículos de procedencia dudosa.',
            'Puedes editar o cancelar la publicación mientras está en revisión.',
          ],
        },
        {
          title: 'Ofertas',
          paragraphs: [
            'Una oferta no te obliga a nada hasta que la aceptas. Si la rechazas, la publicación se cancela. Si al recibir el artículo no coincide con lo descrito, podemos devolvértelo o proponerte una oferta nueva.',
          ],
        },
        {
          title: 'Recogida y pago',
          paragraphs: [
            'Cuando aceptas, coordinamos contigo la recogida o el envío. Pagamos por transferencia a la cuenta de tu certificado bancario una vez recibido y revisado el artículo.',
          ],
        },
        {
          title: 'Tus datos',
          paragraphs: [
            'Tus documentos se guardan en almacenamiento privado y solo los ve el equipo que gestiona tu venta. No vendemos tus datos. Puedes pedir que borremos tu cuenta cuando no tengas ventas en curso.',
          ],
        },
      ],
    },
    en: {
      updated: 'Last updated: September 19, 2026',
      notice:
        'Sample template from the Trueke open source project. If you run the platform with real users, review it with legal counsel and adapt it to your country.',
      sections: [
        {
          title: 'What Trueke is',
          paragraphs: [
            "Trueke buys used items from people who no longer use them. You list the item, our team reviews it and, if we're interested, we make you an offer. It's not a peer-to-peer marketplace: Trueke is the buyer.",
          ],
        },
        {
          title: 'Who can sell',
          paragraphs: [
            'Adults who own the item. To get paid we need your personal details, an ID document and a bank certificate in your name.',
          ],
        },
        {
          title: 'Your listings',
          paragraphs: [
            "Describe the item as it is: actual condition, details, dents and what's included. Say whether it's original; we don't buy replicas or items of doubtful origin.",
            'You can edit or cancel a listing while it is in review.',
          ],
        },
        {
          title: 'Offers',
          paragraphs: [
            "An offer doesn't bind you until you accept it. If you decline, the listing is cancelled. If the item doesn't match the description when we receive it, we may return it or make you a new offer.",
          ],
        },
        {
          title: 'Pickup and payment',
          paragraphs: [
            'Once you accept, we arrange the pickup or shipping with you. We pay by bank transfer to the account on your bank certificate once the item is received and checked.',
          ],
        },
        {
          title: 'Your data',
          paragraphs: [
            "Your documents are kept in private storage and only the team handling your sale can see them. We don't sell your data. You can ask us to delete your account when you have no sales in progress.",
          ],
        },
      ],
    },
  }
