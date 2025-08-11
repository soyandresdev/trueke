"""Campos extra por categoría, definidos con JSON Schema (draft 2020-12).

Cada categoría guarda un esquema de tipo `object`. El frontend lo usa para pintar el formulario
y el backend para validar `Listing.attributes`. Los textos visibles van en `title` (español) y,
opcionalmente, `x-title-en` (inglés).
"""

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError

EMPTY_SCHEMA = {"type": "object", "properties": {}, "additionalProperties": False}


def empty_schema():
    return dict(EMPTY_SCHEMA)


def validate_fields_schema(schema):
    """Valida el esquema que se define desde el admin."""
    if not isinstance(schema, dict) or schema.get("type") != "object":
        raise ValidationError(_('El esquema debe ser un objeto con "type": "object".'))
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError as exc:
        raise ValidationError(_("Esquema JSON inválido: %(error)s") % {"error": exc.message}) from exc


def attribute_errors(schema, attributes) -> dict[str, list[str]]:
    """Errores de `attributes` contra el esquema, agrupados por campo ("" = el objeto completo)."""
    errors: dict[str, list[str]] = {}
    for error in Draft202012Validator(schema).iter_errors(attributes):
        field = str(error.path[0]) if error.path else ""
        if error.validator == "required":
            field, message = error.message.split("'")[1], _("Este campo es obligatorio.")
        elif error.validator == "additionalProperties":
            message = _("Campos no permitidos en esta categoría: %(detail)s") % {"detail": error.message}
        elif error.validator == "enum":
            message = _("Valor no permitido.")
        else:
            message = error.message
        errors.setdefault(field, []).append(message)
    return errors
