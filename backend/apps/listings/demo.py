"""Categorías de demo. Se cargan con `python manage.py load_demo_categories`."""


def _enum(title, title_en, options):
    """Lista de opciones. `options`: (valor, etiqueta en español, etiqueta en inglés)."""
    return {
        "type": "string",
        "title": title,
        "x-title-en": title_en,
        "enum": [value for value, _, _ in options],
        "x-labels": {value: es for value, es, _ in options},
        "x-labels-en": {value: en for value, _, en in options},
    }


CATEGORIES = [
    {
        "code": "tecnologia",
        "name": "Tecnología",
        "name_en": "Tech",
        "fields_schema": {
            "type": "object",
            "properties": {
                "brand": {"type": "string", "title": "Marca", "x-title-en": "Brand", "maxLength": 60},
                "model": {"type": "string", "title": "Modelo", "x-title-en": "Model", "maxLength": 80},
                "storage_gb": {
                    "type": "integer",
                    "title": "Almacenamiento (GB)",
                    "x-title-en": "Storage (GB)",
                    "minimum": 0,
                },
                "includes_box": {
                    "type": "boolean",
                    "title": "¿Incluye cargador o caja?",
                    "x-title-en": "Charger or box included?",
                },
            },
            "required": ["brand", "model"],
            "additionalProperties": False,
        },
    },
    {
        "code": "instrumentos",
        "name": "Instrumentos musicales",
        "name_en": "Musical instruments",
        "fields_schema": {
            "type": "object",
            "properties": {
                "kind": _enum(
                    "Tipo",
                    "Type",
                    [
                        ("string", "Cuerda", "String"),
                        ("keys", "Teclado", "Keys"),
                        ("percussion", "Percusión", "Percussion"),
                        ("wind", "Viento", "Wind"),
                    ],
                ),
                "brand": {"type": "string", "title": "Marca", "x-title-en": "Brand", "maxLength": 60},
            },
            "required": ["kind"],
            "additionalProperties": False,
        },
    },
    {
        "code": "movilidad",
        "name": "Bicicletas y movilidad",
        "name_en": "Bikes & mobility",
        "fields_schema": {
            "type": "object",
            "properties": {
                "kind": _enum(
                    "Tipo",
                    "Type",
                    [
                        ("road", "Ruta", "Road"),
                        ("mountain", "Montaña", "Mountain"),
                        ("city", "Urbana", "City"),
                        ("e_scooter", "Patineta eléctrica", "E-scooter"),
                    ],
                ),
                "size": {
                    "type": "string",
                    "title": "Talla o rodado",
                    "x-title-en": "Size or wheel",
                    "maxLength": 20,
                },
            },
            "required": ["kind"],
            "additionalProperties": False,
        },
    },
    {
        "code": "fotografia",
        "name": "Fotografía",
        "name_en": "Photography",
        "fields_schema": {
            "type": "object",
            "properties": {
                "kind": _enum(
                    "Tipo",
                    "Type",
                    [
                        ("camera", "Cámara", "Camera"),
                        ("lens", "Lente", "Lens"),
                        ("accessory", "Accesorio", "Accessory"),
                    ],
                ),
                "brand": {"type": "string", "title": "Marca", "x-title-en": "Brand", "maxLength": 60},
                "mount": {"type": "string", "title": "Montura", "x-title-en": "Mount", "maxLength": 40},
            },
            "required": ["kind", "brand"],
            "additionalProperties": False,
        },
    },
]
