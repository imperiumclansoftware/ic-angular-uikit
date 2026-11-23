# documents/urls.py — à inclure depuis le urls.py du projet : path("", include("documents.urls"))
from django.urls import path

from . import views

urlpatterns = [
    path("api/uploads", views.upload),
    path("api/uploads/<uuid:id>", views.download),
]
