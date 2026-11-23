# documents/models.py
import uuid

from django.conf import settings
from django.db import models


class Document(models.Model):
    """Métadonnées du fichier ; le fichier lui-même est stocké dans UPLOAD_DIR/<id>."""

    # Python 3.14+ : default=uuid.uuid7 (horodaté)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="documents")
    name = models.CharField(max_length=255)  # nom d'origine, pour l'affichage uniquement
    size = models.PositiveBigIntegerField()
    type = models.CharField(max_length=100)  # type MIME réel, détecté sur le contenu
    created_at = models.DateTimeField(auto_now_add=True)
