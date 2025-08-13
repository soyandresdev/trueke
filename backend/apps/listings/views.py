from django.conf import settings
from django.db.models import Count, Q
from django.utils.translation import gettext as _
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import generics, mixins, parsers, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from . import transitions
from .models import Category, Listing, ListingImage
from .queries import unread_filter, visible_listings
from .serializers import (
    CategorySerializer,
    EmptySerializer,
    ListingEventSerializer,
    ListingImageSerializer,
    ListingSerializer,
    OfferSerializer,
    PickupSerializer,
    ReasonSerializer,
)


class CategoryListView(generics.ListAPIView):
    """Categorías activas con su esquema de campos extra. Pública (la usa la landing)."""

    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


FILTERS = [
    OpenApiParameter("status", description="Uno o varios estados separados por coma"),
    OpenApiParameter("category", description="Código de la categoría"),
    OpenApiParameter("city"),
    OpenApiParameter("q", description="Busca en nombre, descripción y vendedor"),
]


def transition_action(name, serializer_class):
    """Crea el endpoint POST /listings/{id}/<name>/ para una transición."""
    t = transitions.TRANSITIONS[name]

    @extend_schema(request=serializer_class, responses={200: ListingSerializer}, summary=str(t.label))
    def view(self, request, pk=None):
        listing = self.get_object()
        serializer = serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            transitions.apply(listing, request.user, name, **serializer.validated_data)
        except transitions.TransitionError as exc:
            code = status.HTTP_403_FORBIDDEN if exc.code == "not_allowed" else status.HTTP_409_CONFLICT
            return Response({"code": exc.code, "detail": exc.detail}, status=code)
        return Response(ListingSerializer(listing, context=self.get_serializer_context()).data)

    view.__name__ = name
    return action(detail=True, methods=["post"], url_path=name)(view)


@extend_schema(parameters=FILTERS, methods=["GET"])
class ListingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ListingSerializer
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # generación del esquema OpenAPI
            return Listing.objects.none()
        user = self.request.user
        qs = visible_listings(user).annotate(unread_messages=Count("messages", filter=unread_filter(user)))
        qs = qs.order_by("-created_at", "-id")  # con annotate, Meta.ordering no se aplica
        if self.action != "list":
            return qs
        params = self.request.query_params
        if statuses := params.get("status"):
            qs = qs.filter(status__in=statuses.split(","))
        if category := params.get("category"):
            qs = qs.filter(category__code=category)
        if city := params.get("city"):
            qs = qs.filter(city__iexact=city)
        if q := params.get("q"):
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(description__icontains=q)
                | Q(seller__first_name__icontains=q)
                | Q(seller__last_name__icontains=q)
                | Q(seller__phone__icontains=q)
            )
        return qs

    def perform_create(self, serializer):
        listing = serializer.save(seller=self.request.user)
        transitions.record_creation(listing, self.request.user)

    def perform_update(self, serializer):
        self._check_editable(serializer.instance)
        serializer.save()

    def _check_editable(self, listing):
        if listing.seller_id != self.request.user.pk:
            raise PermissionDenied(_("Solo el vendedor puede editar la publicación."))
        if not listing.is_editable:
            raise PermissionDenied(_("La publicación ya no se puede editar."))

    @extend_schema(
        responses={
            200: inline_serializer(
                "ListingStats", {s: serializers.IntegerField() for s in Listing.Status.values}
            )
        }
    )
    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Cuántas publicaciones hay en cada estado (pestañas del panel)."""
        rows = visible_listings(request.user).order_by().values("status").annotate(n=Count("id"))
        counts = {row["status"]: row["n"] for row in rows}
        return Response({s: counts.get(s, 0) for s in Listing.Status.values})

    @extend_schema(responses={200: ListingEventSerializer(many=True)})
    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        listing = self.get_object()
        events = listing.events.select_related("actor")
        return Response(ListingEventSerializer(events, many=True).data)

    @extend_schema(
        request={"multipart/form-data": ListingImageSerializer}, responses={201: ListingImageSerializer}
    )
    @action(detail=True, methods=["post"], parser_classes=[parsers.MultiPartParser])
    def images(self, request, pk=None):
        listing = self.get_object()
        self._check_editable(listing)
        if listing.images.count() >= settings.LISTING_MAX_IMAGES:
            raise ValidationError(
                {"image": _("Máximo %(n)s imágenes por publicación.") % {"n": settings.LISTING_MAX_IMAGES}}
            )
        serializer = ListingImageSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        position = serializer.validated_data.get("position", listing.images.count())
        serializer.save(listing=listing, position=position)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses={204: None})
    @action(detail=True, methods=["delete"], url_path=r"images/(?P<image_id>\d+)")
    def delete_image(self, request, pk=None, image_id=None):
        listing = self.get_object()
        self._check_editable(listing)
        image = generics.get_object_or_404(ListingImage, pk=image_id, listing=listing)
        image.image.delete(save=False)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    offer = transition_action("offer", OfferSerializer)
    accept = transition_action("accept", EmptySerializer)
    reject = transition_action("reject", ReasonSerializer)
    pickup = transition_action("pickup", PickupSerializer)
    complete = transition_action("complete", EmptySerializer)
    cancel = transition_action("cancel", ReasonSerializer)
