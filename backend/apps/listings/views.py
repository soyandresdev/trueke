from django.conf import settings
from django.db.models import Count
from django.utils.translation import gettext as _
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, inline_serializer
from rest_framework import generics, mixins, parsers, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import IsOperator
from apps.accounts.views import serve_private_file

from . import dashboard as dashboard_module
from . import offers as offers_module
from . import transitions
from .models import Category, Listing, ListingImage
from .queries import QUEUES, apply_filters, unread_filter, visible_listings
from .serializers import (
    CategorySerializer,
    CounterSerializer,
    DashboardSerializer,
    EmptySerializer,
    ListingEventSerializer,
    ListingImageSerializer,
    ListingSerializer,
    OfferRowSerializer,
    OfferSerializer,
    PaySerializer,
    PickupSerializer,
    ReasonSerializer,
    SellerSummarySerializer,
)


class CategoryListView(generics.ListAPIView):
    """Categorías activas con su esquema de campos extra. Pública (la usa la landing)."""

    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


ORDERING_PARAM = OpenApiParameter(
    "ordering",
    description="Columna de la tabla de ofertas, con - para descendente",
    enum=sorted(offers_module.ORDERING),
)

FILTERS = [
    OpenApiParameter("status", description="Uno o varios estados separados por coma"),
    OpenApiParameter("queue", description="Cola del operador", enum=sorted(QUEUES)),
    OpenApiParameter("category", description="Código de la categoría"),
    OpenApiParameter("city"),
    OpenApiParameter("q", description="Busca en nombre, descripción y vendedor"),
]


def transition_action(name, serializer_class):
    """Crea el endpoint POST /listings/{id}/<name>/ para una transición."""
    t = transitions.TRANSITIONS[name]

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
    # extend_schema va por fuera de action(), igual que al apilar @extend_schema sobre @action.
    schema = extend_schema(request=serializer_class, responses={200: ListingSerializer}, summary=str(t.label))
    # En la URL con guion (accept-counter); el nombre de la transición sigue con guion bajo.
    return schema(action(detail=True, methods=["post"], url_path=name.replace("_", "-"))(view))


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
        if self.action not in ("list", "offers", "offers_export"):
            return qs
        return apply_filters(qs, self.request.query_params)

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

    @extend_schema(responses={200: SellerSummarySerializer}, summary="Resumen del vendedor")
    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Cuánto ha ganado, cuánto le falta cobrar y cuántas publicaciones tiene en curso."""
        return Response(SellerSummarySerializer(dashboard_module.seller_summary(request.user)).data)

    @extend_schema(responses={200: DashboardSerializer}, summary="Números del panel del operador")
    @action(detail=False, methods=["get"], permission_classes=[IsOperator])
    def dashboard(self, request):
        """Colas de trabajo, embudo y números de los últimos 30 días."""
        return Response(DashboardSerializer(dashboard_module.summary()).data)

    @extend_schema(parameters=[*FILTERS, ORDERING_PARAM], responses={200: OfferRowSerializer(many=True)})
    @action(detail=False, methods=["get"], permission_classes=[IsOperator])
    def offers(self, request):
        """Tabla de ofertas: una fila por publicación, con las fechas de cada paso."""
        qs = self._offer_rows(request)
        page = self.paginate_queryset(qs)
        serializer = OfferRowSerializer(page, many=True, context=self.get_serializer_context())
        return self.get_paginated_response(serializer.data)

    @extend_schema(
        parameters=[*FILTERS, ORDERING_PARAM],
        responses={(200, "text/csv"): OpenApiResponse(description="CSV")},
    )
    @action(detail=False, methods=["get"], url_path="offers/export", permission_classes=[IsOperator])
    def offers_export(self, request):
        """La misma tabla, en CSV, sin paginar."""
        return offers_module.csv_response(self._offer_rows(request))

    def _offer_rows(self, request):
        rows = offers_module.with_dates(self.get_queryset())
        return offers_module.ordered(rows, request.query_params.get("ordering"))

    @extend_schema(responses={(200, "application/octet-stream"): OpenApiResponse(description="Archivo")})
    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        """Comprobante de pago: lo ven el vendedor y los operadores."""
        return serve_private_file(self.get_object().payment_receipt)

    @extend_schema(responses={200: ListingEventSerializer(many=True)})
    @action(detail=True, methods=["get"], pagination_class=None)
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
        serializer.is_valid(raise_exception=True)  # tipo, tamaño y que Pillow pueda abrirla
        image = ListingImage.create_from_upload(
            listing,
            serializer.validated_data["image"],
            serializer.validated_data.get("position", listing.images.count()),
        )
        return Response(
            ListingImageSerializer(image, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=None, responses={204: None})
    @action(detail=True, methods=["delete"], url_path=r"images/(?P<image_id>\d+)")
    def delete_image(self, request, pk=None, image_id=None):
        listing = self.get_object()
        self._check_editable(listing)
        image = generics.get_object_or_404(ListingImage, pk=image_id, listing=listing)
        image.delete_files()
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    offer = transition_action("offer", OfferSerializer)
    accept = transition_action("accept", EmptySerializer)
    reject = transition_action("reject", ReasonSerializer)
    counter = transition_action("counter", CounterSerializer)
    accept_counter = transition_action("accept_counter", EmptySerializer)
    pickup = transition_action("pickup", PickupSerializer)
    complete = transition_action("complete", EmptySerializer)
    pay = transition_action("pay", PaySerializer)
    cancel = transition_action("cancel", ReasonSerializer)
