"""Datos de demo: categorías, un operador, dos vendedores y 12 publicaciones en todos los estados.

Las publicaciones avanzan con la máquina de estados real, así que también quedan historial,
mensajes y notificaciones. Las fotos salen de `brand/images/` (en Docker se monta en `/brand/images`).
"""

from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.chat.models import Message
from apps.listings import transitions
from apps.listings.models import Category, Listing, ListingImage

OPERATOR = {"phone": "+573000000001", "first_name": "Sara", "last_name": "Operadora"}
# Laura tiene el perfil completo (puede aceptar ofertas); Mateo no.
LAURA = {"phone": "+573000000002", "first_name": "Laura", "last_name": "Gómez", "email": "laura@example.com"}
MATEO = {"phone": "+573000000003", "first_name": "Mateo", "last_name": "Rojas"}

# Acciones hasta llegar a cada estado: (acción, quién, datos).
OFFER = ("offer", "operator", {})  # el monto sale de LISTINGS
PATHS = {
    "in_review": [],
    "offered": [OFFER],
    "countered": [OFFER, ("counter", "seller", {})],  # la contraoferta pide un 10 % más
    "accepted": [OFFER, ("accept", "seller", {})],
    "pickup_sent": [
        OFFER,
        ("accept", "seller", {}),
        ("pickup", "operator", {"pickup_by": "platform", "notes": "pickup_notes"}),
    ],
    "completed": [
        OFFER,
        ("accept", "seller", {}),
        ("pickup", "operator", {"pickup_by": "seller"}),
        ("complete", "operator", {}),
    ],
    "paid": [
        OFFER,
        ("accept", "seller", {}),
        ("pickup", "operator", {"pickup_by": "platform"}),
        ("complete", "operator", {}),
        ("pay", "operator", {"reference": "TRF-20260915"}),
    ],
    "rejected": [OFFER, ("reject", "seller", {"reason": "reject_reason"})],
    "cancelled": [("cancel", "seller", {"reason": "cancel_reason"})],
}

LISTINGS = [
    # (imagen, categoría, vendedor, camino en PATHS, oferta, título, descripción, condición, campos)
    ("demo-celular", "tecnologia", "laura", "countered", 650_000, "Celular de 128 GB",
     "Pantalla sin rayones, batería al 89 %. Lo cambié por uno más nuevo.", "like_new",
     {"brand": "Samsung", "model": "Galaxy S21", "storage_gb": 128, "includes_box": True}),
    ("demo-consola", "tecnologia", "mateo", "in_review", 0, "Consola portátil con dos controles",
     "Funciona perfecto. Incluye estuche y tres juegos físicos.", "good",
     {"brand": "Nintendo", "model": "Switch OLED", "storage_gb": 64, "includes_box": False}),
    ("demo-audifonos", "tecnologia", "laura", "completed", 280_000, "Audífonos inalámbricos",
     "Cancelación de ruido, almohadillas cambiadas hace poco.", "good",
     {"brand": "Sony", "model": "WH-1000XM4", "includes_box": True}),
    ("demo-guitarra", "instrumentos", "laura", "pickup_sent", 420_000, "Guitarra acústica",
     "Cuerdas nuevas, trae estuche blando.", "good", {"kind": "string", "brand": "Yamaha"}),
    ("demo-teclado", "instrumentos", "mateo", "in_review", 0, "Teclado controlador de 49 teclas",
     "Ideal para producir en casa. Se conecta por USB.", "like_new", {"kind": "keys", "brand": "Arturia"}),
    ("demo-ukulele", "instrumentos", "mateo", "rejected", 90_000, "Ukelele soprano",
     "Lo usé un semestre. Tiene un golpe pequeño atrás.", "fair", {"kind": "string"}),
    ("demo-bici-ruta", "movilidad", "laura", "accepted", 1_900_000, "Bicicleta de ruta talla M",
     "Grupo Shimano 105, revisión hecha en agosto.", "good", {"kind": "road", "size": "M"}),
    ("demo-bici-montana", "movilidad", "mateo", "offered", 1_200_000, "Bicicleta de montaña rin 29",
     "Suspensión delantera, frenos de disco hidráulicos.", "fair", {"kind": "mountain", "size": "29"}),
    ("demo-patineta", "movilidad", "mateo", "cancelled", 0, "Patineta eléctrica",
     "Autonomía de unos 20 km. Incluye cargador.", "good", {"kind": "e_scooter"}),
    ("demo-mirrorless", "fotografia", "laura", "in_review", 0, "Cámara mirrorless con lente kit",
     "Menos de 5.000 disparos. Dos baterías.", "like_new",
     {"kind": "camera", "brand": "Fujifilm", "mount": "X"}),
    ("demo-lente", "fotografia", "laura", "paid", 850_000, "Lente 50 mm f/1.8",
     "Sin hongos ni rayones. Con tapas.", "like_new", {"kind": "lens", "brand": "Canon", "mount": "RF"}),
    ("demo-camara-pelicula", "fotografia", "mateo", "offered", 350_000, "Cámara de película 35 mm",
     "Fotómetro funcionando. Probada con un rollo este año.", "fair",
     {"kind": "camera", "brand": "Pentax", "mount": "K"}),
]  # fmt: skip

# Textos de las acciones: en PATHS van como claves y aquí en cada idioma.
TEXTS = {
    "es": {
        "pickup_notes": "Dejar en portería si no hay nadie.",
        "reject_reason": "Esperaba un poco más.",
        "cancel_reason": "Al final me lo quedo.",
    },
    "en": {
        "pickup_notes": "Leave it at the front desk if nobody is home.",
        "reject_reason": "I was hoping for a bit more.",
        "cancel_reason": "I decided to keep it.",
    },
}

# Título y descripción en inglés de cada publicación de LISTINGS (por su imagen).
ENGLISH = {
    "demo-celular": (
        "128 GB phone",
        "No scratches on the screen, battery at 89%. I upgraded to a newer one.",
    ),
    "demo-consola": (
        "Handheld console with two controllers",
        "Works perfectly. Comes with a case and three games.",
    ),
    "demo-audifonos": ("Wireless headphones", "Noise cancelling, ear pads replaced recently."),
    "demo-guitarra": ("Acoustic guitar", "New strings, comes with a soft case."),
    "demo-teclado": ("49-key MIDI controller", "Great for making music at home. Connects by USB."),
    "demo-ukulele": ("Soprano ukulele", "I used it for one semester. It has a small dent on the back."),
    "demo-bici-ruta": ("Road bike, size M", "Shimano 105 groupset, serviced in August."),
    "demo-bici-montana": ("Mountain bike, 29-inch wheels", "Front suspension, hydraulic disc brakes."),
    "demo-patineta": ("Electric scooter", "About 20 km of range. Charger included."),
    "demo-mirrorless": ("Mirrorless camera with kit lens", "Fewer than 5,000 shots. Two batteries."),
    "demo-lente": ("50 mm f/1.8 lens", "No fungus or scratches. Caps included."),
    "demo-camara-pelicula": ("35 mm film camera", "Light meter works. Tested with a roll this year."),
}

CHATS = {
    "es": {
        "demo-celular": [
            ("seller", "Hola, ¿la oferta incluye el envío?"),
            ("operator", "Sí, nosotros pasamos a recogerlo sin costo."),
        ],
        "demo-bici-ruta": [
            ("operator", "¡Gracias por aceptar! ¿Qué día te queda bien para la recogida?"),
            ("seller", "Entre semana después de las 6 p. m."),
        ],
        "demo-consola": [("seller", "Puedo mandar más fotos de los controles si hace falta.")],
    },
    "en": {
        "demo-celular": [
            ("seller", "Hi, does the offer include shipping?"),
            ("operator", "Yes, we pick it up at no cost."),
        ],
        "demo-bici-ruta": [
            ("operator", "Thanks for accepting! Which day works for the pickup?"),
            ("seller", "Weekdays after 6 p.m."),
        ],
        "demo-consola": [("seller", "I can send more photos of the controllers if you need them.")],
    },
}


class Command(BaseCommand):
    help = "Carga datos de demo (usuarios, publicaciones en todos los estados, mensajes)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Borra antes las publicaciones de demo.")
        parser.add_argument("--images", default=str(settings.BASE_DIR.parent / "brand" / "images"))
        parser.add_argument("--force", action="store_true", help="Permite correrlo con DEBUG=false.")
        parser.add_argument(
            "--language", choices=["en", "es"], default="en", help="Idioma de los textos y de los usuarios."
        )

    def handle(self, *args, reset, images, force, language, **options):
        self.language = language
        if not settings.DEBUG and not force:
            raise CommandError("Esto crea usuarios de demo. Úsalo con DEBUG=true o pasa --force.")
        images_dir = Path(images)
        if not images_dir.is_dir():
            raise CommandError(f"No encuentro las imágenes en {images_dir}.")

        call_command("load_demo_categories", stdout=self.stdout)
        people = self.users()
        demo = Listing.objects.filter(seller__in=[people["laura"], people["mateo"]])
        if demo.exists():
            if not reset:
                self.stdout.write("Ya hay datos de demo. Usa --reset para volver a crearlos.")
                return
            for image in ListingImage.objects.filter(listing__in=demo):
                image.image.delete(save=False)
            demo.delete()

        for row in LISTINGS:
            self.listing(people, images_dir, row)

        self.stdout.write(self.style.SUCCESS(f"Listo: {len(LISTINGS)} publicaciones."))
        self.stdout.write("Entra con el código OTP que sale en la consola del backend:")
        for label, data in [("operador", OPERATOR), ("vendedora", LAURA), ("vendedor", MATEO)]:
            self.stdout.write(f"  {label:<10} {data['phone']}")

    def users(self):
        language = {"language": self.language}
        operator, _ = User.objects.update_or_create(
            phone=OPERATOR["phone"],
            defaults={**OPERATOR, **language, "role": User.Role.OPERATOR, "is_staff": True},
        )
        laura, _ = User.objects.update_or_create(phone=LAURA["phone"], defaults={**LAURA, **language})
        if not laura.profile_complete:
            laura.document_type = User.DocumentType.NATIONAL_ID
            laura.document_number = "1020304050"
            laura.document_file.save("documento.pdf", ContentFile(b"%PDF-1.4 demo"), save=False)
            laura.bank_certificate.save("banco.pdf", ContentFile(b"%PDF-1.4 demo"), save=False)
            laura.save()
        mateo, _ = User.objects.update_or_create(phone=MATEO["phone"], defaults={**MATEO, **language})
        return {"operator": operator, "laura": laura, "mateo": mateo}

    @transaction.atomic
    def listing(self, people, images_dir, row):
        image, category, seller, path, amount, title, description, condition, attributes = row
        if self.language == "en":
            title, description = ENGLISH[image]
        texts = TEXTS[self.language]
        seller = people[seller]
        listing = Listing.objects.create(
            seller=seller,
            category=Category.objects.get(code=category),
            title=title,
            description=description,
            condition=condition,
            attributes=attributes,
            city="Bogotá" if seller == people["laura"] else "Medellín",
            pickup_address="Calle 85 # 12-40" if seller == people["laura"] else "Carrera 43A # 7-50",
            terms_accepted_at=timezone.now(),
        )
        with (images_dir / f"{image}.jpg").open("rb") as f:
            ListingImage.objects.create(listing=listing, image=File(f, name=f"{image}.jpg"))
        transitions.record_creation(listing, seller)

        actors = {"seller": seller, "operator": people["operator"]}
        for action, who, data in PATHS[path]:
            if action == "offer":
                data = {"amount": amount, "currency": settings.LISTING_CURRENCY}
            elif action == "pay":
                data = {**data, "amount": amount}
            elif action == "counter":
                data = {"amount": round(amount * 1.1)}
            # Los textos de las acciones (motivo, indicaciones) van como claves de TEXTS.
            data = {
                key: texts.get(value, value) if isinstance(value, str) else value
                for key, value in data.items()
            }
            transitions.apply(listing, actors[who], action, **data)

        for who, text in CHATS[self.language].get(image, []):
            Message.objects.create(
                listing=listing, sender=actors[who], from_platform=who == "operator", text=text
            )
        self.stdout.write(f"  {listing.get_status_display():<17} {title}")
