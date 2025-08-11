import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.tests.factories import OperatorFactory, UserFactory

from .factories import CategoryFactory, ListingFactory


@pytest.fixture
def seller():
    return UserFactory()


@pytest.fixture
def operator():
    return OperatorFactory()


@pytest.fixture
def category():
    return CategoryFactory()


@pytest.fixture
def listing(seller, category):
    return ListingFactory(seller=seller, category=category)


@pytest.fixture
def as_user(api):
    def login(user):
        api.force_authenticate(user)
        return api

    return login


@pytest.fixture
def complete_profile():
    def complete(user):
        user.document_type = "national_id"
        user.document_number = "123"
        user.document_file = SimpleUploadedFile("d.pdf", b"%PDF")
        user.bank_certificate = SimpleUploadedFile("b.pdf", b"%PDF")
        user.save()
        return user

    return complete
