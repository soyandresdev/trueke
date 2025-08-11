from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("listings", views.ListingViewSet, basename="listing")

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="category-list"),
    *router.urls,
]
