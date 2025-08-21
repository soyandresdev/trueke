from django.contrib import admin

from .models import Category, Listing, ListingEvent, ListingImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "position", "is_active"]
    list_editable = ["position", "is_active"]
    prepopulated_fields = {"code": ["name"]}


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 0


class ListingEventInline(admin.TabularInline):
    model = ListingEvent
    extra = 0
    can_delete = False
    readonly_fields = ["action", "from_status", "to_status", "actor", "data", "created_at"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ["title", "seller", "category", "city", "status", "offer_amount", "created_at"]
    list_filter = ["status", "category", "pickup_by"]
    search_fields = ["title", "description", "seller__phone", "seller__first_name", "seller__last_name"]
    raw_id_fields = ["seller"]
    # El estado y sus datos solo cambian con la máquina de estados (API), nunca a mano.
    readonly_fields = [
        "status",
        "status_changed_at",
        "offer_amount",
        "offer_currency",
        "counter_amount",
        "pickup_by",
        "pickup_date",
        "pickup_notes",
        "cancel_reason",
        "paid_amount",
        "paid_at",
        "payment_reference",
        "payment_receipt",
        "terms_accepted_at",
        "created_at",
        "updated_at",
    ]
    inlines = [ListingImageInline, ListingEventInline]
