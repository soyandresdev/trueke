from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import OtpCode, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["-date_joined"]
    list_display = ["phone", "first_name", "last_name", "role", "profile_complete", "date_joined"]
    list_filter = ["role", "is_active", "is_staff"]
    search_fields = ["phone", "first_name", "last_name", "email", "document_number"]
    fieldsets = [
        (None, {"fields": ["phone", "password"]}),
        (_("Perfil"), {"fields": ["first_name", "last_name", "email", "photo", "language", "role"]}),
        (
            _("Documentos"),
            {"fields": ["document_type", "document_number", "document_file", "bank_certificate"]},
        ),
        (_("Permisos"), {"fields": ["is_active", "is_staff", "is_superuser", "groups", "user_permissions"]}),
        (_("Fechas"), {"fields": ["last_login", "date_joined"]}),
    ]
    add_fieldsets = [(None, {"classes": ["wide"], "fields": ["phone", "password1", "password2", "role"]})]

    @admin.display(boolean=True, description=_("perfil completo"))
    def profile_complete(self, obj):
        return obj.profile_complete


@admin.register(OtpCode)
class OtpCodeAdmin(admin.ModelAdmin):
    list_display = ["phone", "created_at", "expires_at", "attempts", "used_at"]
    search_fields = ["phone"]
    readonly_fields = ["phone", "code_hash", "created_at", "expires_at", "attempts", "used_at"]
