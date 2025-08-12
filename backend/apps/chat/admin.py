from django.contrib import admin

from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["listing", "sender", "from_platform", "__str__", "created_at", "read_at"]
    list_filter = ["from_platform"]
    raw_id_fields = ["listing", "sender"]
    readonly_fields = ["created_at", "read_at"]
