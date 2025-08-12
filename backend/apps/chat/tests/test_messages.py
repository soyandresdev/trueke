import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.accounts.tests.factories import OperatorFactory, UserFactory
from apps.chat.models import Message
from apps.listings.tests.factories import ListingFactory

pytestmark = pytest.mark.django_db

PDF = b"%PDF-1.4 comprobante"


@pytest.fixture
def listing():
    return ListingFactory()


@pytest.fixture
def operator():
    return OperatorFactory()


def messages_url(listing):
    return reverse("message-list", args=[listing.pk])


def send(api, user, listing, **data):
    api.force_authenticate(user)
    fmt = "multipart" if "attachment" in data else "json"
    return api.post(messages_url(listing), data, format=fmt)


def test_seller_and_operator_talk(api, listing, operator):
    assert send(api, listing.seller, listing, text="Hola").status_code == 201
    response = send(api, operator, listing, text="  Te ofrecemos 400 mil  ")
    assert response.status_code == 201
    assert response.data["from_platform"] is True
    assert response.data["text"] == "Te ofrecemos 400 mil"

    api.force_authenticate(listing.seller)
    results = api.get(messages_url(listing)).data["results"]
    assert [m["text"] for m in results] == ["Te ofrecemos 400 mil", "Hola"]
    assert [m["from_platform"] for m in results] == [True, False]


def test_strangers_cannot_read_or_write(api, listing):
    stranger = UserFactory()
    assert send(api, stranger, listing, text="hola").status_code == 404
    assert api.get(messages_url(listing)).status_code == 404
    assert api.post(reverse("message-read", args=[listing.pk])).status_code == 404


def test_requires_authentication(api, listing):
    assert api.get(messages_url(listing)).status_code == 401


def test_empty_message_is_rejected(api, listing):
    assert send(api, listing.seller, listing, text="   ").status_code == 400


def test_sender_cannot_forge_side_or_listing(api, listing):
    other = ListingFactory(seller=listing.seller)
    api.force_authenticate(listing.seller)
    data = {"text": "hola", "from_platform": True, "listing": other.pk}
    assert api.post(messages_url(listing), data, format="json").status_code == 201
    message = Message.objects.get()
    assert message.from_platform is False
    assert message.listing == listing


def test_attachment_is_private_and_downloadable_by_both_sides(api, listing, operator):
    pdf = SimpleUploadedFile("cédula juan.pdf", PDF, content_type="application/pdf")
    response = send(api, listing.seller, listing, attachment=pdf)
    assert response.status_code == 201, response.data
    assert response.data["attachment_kind"] == "pdf"
    url = response.data["attachment_url"]
    assert url == reverse("message-attachment", args=[listing.pk, response.data["id"]])

    message = Message.objects.get()
    assert "juan" not in message.attachment.name
    with pytest.raises(ValueError):
        message.attachment.url  # noqa: B018 - sin URL pública

    for user in (listing.seller, operator):
        api.force_authenticate(user)
        download = api.get(url)
        assert download.status_code == 200
        assert b"".join(download.streaming_content) == PDF

    api.force_authenticate(UserFactory())
    assert api.get(url).status_code == 404


def test_attachment_validation(api, listing, settings):
    bad = SimpleUploadedFile("script.exe", b"MZ", content_type="application/octet-stream")
    assert send(api, listing.seller, listing, attachment=bad).status_code == 400
    settings.CHAT_FILE_MAX_MB = 1
    big = SimpleUploadedFile("a.pdf", b"0" * (1024 * 1024 + 1), content_type="application/pdf")
    assert send(api, listing.seller, listing, attachment=big).status_code == 400


def test_attachment_of_other_listing_is_404(api, listing):
    other = ListingFactory(seller=listing.seller)
    pdf = SimpleUploadedFile("a.pdf", PDF, content_type="application/pdf")
    message_id = send(api, listing.seller, listing, attachment=pdf).data["id"]
    assert api.get(reverse("message-attachment", args=[other.pk, message_id])).status_code == 404


def test_mark_read_only_touches_other_side(api, listing, operator):
    send(api, listing.seller, listing, text="1")
    send(api, operator, listing, text="2")
    send(api, operator, listing, text="3")

    api.force_authenticate(listing.seller)
    assert api.post(reverse("message-read", args=[listing.pk])).data == {"updated": 2}
    assert api.post(reverse("message-read", args=[listing.pk])).data == {"updated": 0}
    assert Message.objects.get(text="1").read_at is None

    api.force_authenticate(operator)
    assert api.post(reverse("message-read", args=[listing.pk])).data == {"updated": 1}


def test_unread_counter_in_listings(api, listing, operator):
    send(api, listing.seller, listing, text="hola")
    send(api, operator, listing, text="a")
    send(api, operator, listing, text="b")

    def unread(user):
        api.force_authenticate(user)
        list_value = api.get(reverse("listing-list")).data["results"][0]["unread_messages"]
        detail_value = api.get(reverse("listing-detail", args=[listing.pk])).data["unread_messages"]
        assert list_value == detail_value
        return list_value

    assert unread(listing.seller) == 2
    assert unread(operator) == 1
    api.post(reverse("message-read", args=[listing.pk]))
    assert unread(operator) == 0


def test_pagination_is_cursor_based(api, listing, settings):
    Message.objects.bulk_create(
        [Message(listing=listing, sender=listing.seller, from_platform=False, text=str(i)) for i in range(35)]
    )
    api.force_authenticate(listing.seller)
    first = api.get(messages_url(listing)).data
    assert len(first["results"]) == 30 and first["next"]
    second = api.get(first["next"]).data
    assert len(second["results"]) == 5


def test_message_created_is_broadcast(api, listing, django_capture_on_commit_callbacks):
    from unittest import mock

    with (
        mock.patch("apps.chat.views.broadcast") as broadcast,
        django_capture_on_commit_callbacks(execute=True),
    ):
        send(api, listing.seller, listing, text="hola")
    channel, event, data = broadcast.call_args.args
    assert (channel, event, data["text"]) == (f"listing.{listing.pk}", "message.created", "hola")
