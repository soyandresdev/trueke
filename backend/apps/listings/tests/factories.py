import factory
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.listings.models import Category, Listing

SCHEMA = {
    "type": "object",
    "properties": {
        "brand": {"type": "string", "title": "Marca", "maxLength": 60},
        "storage_gb": {"type": "integer", "title": "Almacenamiento", "minimum": 0},
        "kind": {"type": "string", "enum": ["phone", "console"]},
    },
    "required": ["brand"],
    "additionalProperties": False,
}


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        django_get_or_create = ["code"]

    code = factory.Sequence(lambda n: f"cat-{n}")
    name = factory.Sequence(lambda n: f"Categoría {n}")
    fields_schema = factory.LazyFunction(lambda: dict(SCHEMA))


class ListingFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Listing

    seller = factory.SubFactory(UserFactory)
    category = factory.SubFactory(CategoryFactory)
    title = "Consola portátil"
    description = "Poco uso, con dos controles."
    condition = Listing.Condition.GOOD
    attributes = factory.LazyFunction(lambda: {"brand": "Nintendo"})
    city = "Bogotá"
    pickup_address = "Calle 1 # 2-3"
    terms_accepted_at = factory.LazyFunction(timezone.now)
