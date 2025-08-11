import factory

from apps.accounts.models import User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ["phone"]

    phone = factory.Sequence(lambda n: f"+57300{n:07d}")
    first_name = factory.Faker("first_name", locale="es_CO")
    last_name = factory.Faker("last_name", locale="es_CO")


class OperatorFactory(UserFactory):
    role = User.Role.OPERATOR
    is_staff = True
