# documents/views.py — pip install filetype
import os
import re
from pathlib import Path

import filetype
from django.conf import settings
from django.http import FileResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import Document

# Types acceptés (détectés sur le contenu) → extensions autorisées. SVG et HTML exclus.
ALLOWED = {
    "image/png": {"png"},
    "image/jpeg": {"jpg", "jpeg"},
    "image/webp": {"webp"},
    "application/pdf": {"pdf"},
}
CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


def _error(status: int, message: str) -> JsonResponse:
    return JsonResponse({"error": message}, status=status)


@require_POST  # le CsrfViewMiddleware vérifie X-XSRF-TOKEN = cookie XSRF-TOKEN
def upload(request):
    if not request.user.is_authenticated:
        return _error(401, "Authentification requise.")
    file = request.FILES.get("file")
    if file is None:
        return _error(400, "Aucun fichier reçu (champ « file »).")
    if file.size > settings.UPLOAD_MAX_SIZE:
        return _error(413, "Fichier trop volumineux (5 Mo max).")

    # Type réel lu dans les premiers octets (jamais file.content_type, fourni par le client).
    head = file.read(261)
    file.seek(0)
    kind = filetype.guess(head)
    extension = Path(file.name).suffix.lower().lstrip(".")
    if kind is None or extension not in ALLOWED.get(kind.mime, set()):
        return _error(415, "Type de fichier non autorisé.")

    name = CONTROL_CHARS.sub("", Path(file.name).name)[:255]
    document = Document(owner=request.user, name=name, size=file.size, type=kind.mime)
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    # Nom de stockage = UUID ; création exclusive (« x ») et droits restreints.
    fd = os.open(upload_dir / str(document.id), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    document.save()

    return JsonResponse({"id": str(document.id), "name": name, "size": document.size, "type": document.type}, status=201)


@require_GET
@ensure_csrf_cookie  # pose le cookie XSRF-TOKEN pour les requêtes suivantes
def download(request, id):
    if not request.user.is_authenticated:
        return _error(401, "Authentification requise.")
    # Filtre propriétaire dans la requête ; 404 plutôt que 403 pour ne pas révéler l'existence.
    document = Document.objects.filter(id=id, owner=request.user).first()
    if document is None:
        return _error(404, "Introuvable.")
    response = FileResponse(
        open(Path(settings.UPLOAD_DIR) / str(document.id), "rb"),
        as_attachment=True,
        filename=document.name,
        content_type=document.type,
    )
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store"
    return response

