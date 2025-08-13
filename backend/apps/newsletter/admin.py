import csv

from django.contrib import admin
from django.http import HttpResponse
from django.utils.translation import gettext_lazy as _

from .models import Subscriber


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ["email", "language", "created_at", "unsubscribed_at"]
    list_filter = ["language", ("unsubscribed_at", admin.EmptyFieldListFilter)]
    search_fields = ["email"]
    actions = ["export_csv"]

    @admin.action(description=_("Exportar activos a CSV"))
    def export_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="suscriptores.csv"'
        writer = csv.writer(response)
        writer.writerow(["email", "language", "created_at"])
        for s in queryset.filter(unsubscribed_at__isnull=True):
            writer.writerow([s.email, s.language, s.created_at.isoformat()])
        return response
