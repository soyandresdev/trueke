from django.http import FileResponse, Http404, HttpResponseRedirect
from django.utils.translation import gettext as _
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, parsers, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from . import otp
from .models import User
from .serializers import (
    AuthResponseSerializer,
    DocumentsSerializer,
    OtpRequestSerializer,
    OtpVerifySerializer,
    UserSerializer,
)


class OtpRequestView(APIView):
    """Envía un código de acceso al teléfono."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(
        request=OtpRequestSerializer, responses={202: OpenApiResponse(description="Código enviado")}
    )
    def post(self, request):
        serializer = OtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            issued = otp.issue_code(serializer.validated_data["phone"])
        except otp.ResendTooSoon as exc:
            return Response(
                {
                    "code": exc.code,
                    "detail": _("Espera antes de pedir otro código."),
                    "wait": exc.wait_seconds,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response(
            {"expires_in": issued.expires_in, "resend_in": issued.resend_in}, status=status.HTTP_202_ACCEPTED
        )


class OtpVerifyView(APIView):
    """Verifica el código. Si el teléfono no tiene cuenta, la crea."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(request=OtpVerifySerializer, responses={200: AuthResponseSerializer})
    def post(self, request):
        serializer = OtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        try:
            otp.verify_code(phone, serializer.validated_data["code"])
        except otp.InvalidCode as exc:
            return Response(
                {"code": exc.code, "detail": _("El código es incorrecto o ya venció.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(phone=phone).first()
        created = user is None
        if created:
            user = User.objects.create_user(phone=phone, language=request.LANGUAGE_CODE[:2])
        elif not user.is_active:
            return Response(
                {"code": "inactive", "detail": _("Esta cuenta está desactivada.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "created": created,
            "user": UserSerializer(user, context={"request": request}).data,
        }
        return Response(data)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user


class MyDocumentsView(generics.UpdateAPIView):
    """Sube el documento de identidad y/o el certificado bancario (multipart)."""

    serializer_class = DocumentsSerializer
    parser_classes = [parsers.MultiPartParser]
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = self.request.user
        # Borra el archivo anterior para no dejar documentos huérfanos.
        for field in ("document_file", "bank_certificate"):
            if field in serializer.validated_data and getattr(user, field):
                getattr(user, field).delete(save=False)
        serializer.save()

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        super().update(request, *args, **kwargs)
        return Response(UserSerializer(request.user, context={"request": request}).data)


def serve_private_file(file):
    """Devuelve un archivo privado: URL firmada si está en S3, stream si está en disco."""
    if not file:
        raise Http404
    try:
        file.path  # noqa: B018 - solo existe en almacenamiento local
    except NotImplementedError:
        return HttpResponseRedirect(file.url)
    return FileResponse(file.open("rb"), as_attachment=False)


class MyDocumentFileView(APIView):
    FIELDS = {"document": "document_file", "bank-certificate": "bank_certificate"}

    @extend_schema(responses={(200, "application/octet-stream"): OpenApiResponse(description="Archivo")})
    def get(self, request, kind):
        if kind not in self.FIELDS:
            raise Http404
        return serve_private_file(getattr(request.user, self.FIELDS[kind]))
