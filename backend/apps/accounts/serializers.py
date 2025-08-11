from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import User
from .phone import normalize_phone


class PhoneField(serializers.CharField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        try:
            return normalize_phone(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc


class OtpRequestSerializer(serializers.Serializer):
    phone = PhoneField(max_length=30)


class OtpVerifySerializer(serializers.Serializer):
    phone = PhoneField(max_length=30)
    code = serializers.RegexField(r"^\d{4,8}$", error_messages={"invalid": _("Código inválido.")})


class UserSerializer(serializers.ModelSerializer):
    has_document_file = serializers.SerializerMethodField()
    has_bank_certificate = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "phone",
            "first_name",
            "last_name",
            "email",
            "photo",
            "language",
            "role",
            "document_type",
            "document_number",
            "has_document_file",
            "has_bank_certificate",
            "profile_complete",
            "date_joined",
        ]
        read_only_fields = ["id", "phone", "role", "profile_complete", "date_joined"]

    def get_has_document_file(self, user) -> bool:
        return bool(user.document_file)

    def get_has_bank_certificate(self, user) -> bool:
        return bool(user.bank_certificate)


class DocumentsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["document_file", "bank_certificate"]
        extra_kwargs = {"document_file": {"write_only": True}, "bank_certificate": {"write_only": True}}


class AuthResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    created = serializers.BooleanField()
    user = UserSerializer()
