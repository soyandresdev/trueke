"""Categorías de demo (ver PLAN.md). Se cargan con `python manage.py load_demo_categories`."""


def _enum(title, options):
    return {"type": "string", "title": title, "enum": [v for v, _ in options], "x-labels": dict(options)}


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
                    [
                        ("string", "Cuerda"),
                        ("keys", "Teclado"),
                        ("percussion", "Percusión"),
                        ("wind", "Viento"),
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
                    [
                        ("road", "Ruta"),
                        ("mountain", "Montaña"),
                        ("city", "Urbana"),
                        ("e_scooter", "Patineta eléctrica"),
                    ],
                ),
                "size": {"type": "string", "title": "Talla o rodado", "x-title-en": "Size", "maxLength": 20},
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
                "kind": _enum("Tipo", [("camera", "Cámara"), ("lens", "Lente"), ("accessory", "Accesorio")]),
                "brand": {"type": "string", "title": "Marca", "x-title-en": "Brand", "maxLength": 60},
                "mount": {"type": "string", "title": "Montura", "x-title-en": "Mount", "maxLength": 40},
            },
            "required": ["kind", "brand"],
            "additionalProperties": False,
        },
    },
]
