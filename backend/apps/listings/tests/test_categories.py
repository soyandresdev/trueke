import pytest
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.urls import reverse

from apps.listings.models import Category
from apps.listings.schema import attribute_errors, validate_fields_schema

from .factories import SCHEMA, CategoryFactory

pytestmark = pytest.mark.django_db


def test_categories_are_public_and_only_active(api):
    CategoryFactory(code="activa", name="Activa")
    CategoryFactory(code="oculta", is_active=False)
    response = api.get(reverse("category-list"))
    assert response.status_code == 200
    assert [c["code"] for c in response.data] == ["activa"]
    assert response.data[0]["fields_schema"]["required"] == ["brand"]


def test_category_name_in_english(api):
    CategoryFactory(code="tech", name="Tecnología", name_en="Tech")
    response = api.get(reverse("category-list"), HTTP_ACCEPT_LANGUAGE="en")
    assert response.data[0]["name"] == "Tech"


@pytest.mark.parametrize(
    "schema",
    [
        {"type": "array"},
        {"properties": {}},
        {"type": "object", "properties": {"x": {"type": "nope"}}},
        [],
    ],
)
def test_invalid_fields_schema_is_rejected(schema):
    with pytest.raises(ValidationError):
        validate_fields_schema(schema)


def test_attribute_errors_by_field():
    errors = attribute_errors(SCHEMA, {"storage_gb": -1, "kind": "tv", "color": "rojo"})
    assert set(errors) == {"brand", "storage_gb", "kind", ""}
    assert attribute_errors(SCHEMA, {"brand": "Sony", "storage_gb": 512}) == {}


def test_load_demo_categories_is_idempotent():
    call_command("load_demo_categories", stdout=open("/dev/null", "w"))  # noqa: SIM115
    call_command("load_demo_categories", stdout=open("/dev/null", "w"))  # noqa: SIM115
    assert list(Category.objects.values_list("code", flat=True)) == [
        "tecnologia",
        "instrumentos",
        "movilidad",
        "fotografia",
    ]
