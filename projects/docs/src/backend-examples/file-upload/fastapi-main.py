# main.py — Python 3.11+, FastAPI, python-multipart, filetype
# pip install fastapi uvicorn python-multipart filetype   ·   uvicorn main:app
import json
import os
import re
import secrets
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

import filetype
from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse

UPLOAD_DIR = Path("var/uploads")  # hors du dossier servi en statique
MAX_SIZE = 5 * 1024 * 1024  # 5 Mo (limitez aussi la taille du corps côté proxy)
# Types acceptés (détectés sur le contenu) → extensions autorisées. SVG et HTML exclus.
ALLOWED = {
    "image/png": {"png"},
    "image/jpeg": {"jpg", "jpeg"},
    "image/webp": {"webp"},
    "application/pdf": {"pdf"},
}
CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

app = FastAPI()
UPLOAD_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)


@app.middleware("http")
async def csrf_double_submit(request: Request, call_next):
    """CSRF « double submit » compatible Angular : cookie XSRF-TOKEN = en-tête X-XSRF-TOKEN."""
    cookie = request.cookies.get("XSRF-TOKEN", "")
    if request.method not in SAFE_METHODS:
        header = request.headers.get("X-XSRF-TOKEN", "")
        if not cookie or not secrets.compare_digest(cookie.encode(), header.encode()):
            return JSONResponse({"error": "Jeton CSRF invalide."}, status_code=403)
    response = await call_next(request)
    if not cookie:
        response.set_cookie("XSRF-TOKEN", secrets.token_urlsafe(32), samesite="strict", secure=request.url.scheme == "https", httponly=False)
    return response


def current_user(request: Request) -> str:
    """À brancher sur votre authentification (session HttpOnly) : renvoie l'id de l'utilisateur."""
    user_id = request.session.get("user_id") if "session" in request.scope else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentification requise.")
    return str(user_id)


User = Annotated[str, Depends(current_user)]


@app.post("/api/uploads", status_code=201)
async def upload(user: User, file: UploadFile | None = None):
    if file is None:
        raise HTTPException(400, "Aucun fichier reçu (champ « file »).")
    # Lecture bornée : on ne fait pas confiance à la taille annoncée.
    content = await file.read(MAX_SIZE + 1)
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "Fichier trop volumineux (5 Mo max).")

    # Type réel lu dans le contenu (jamais file.content_type, fourni par le client).
    kind = filetype.guess(content[:261])
    extension = Path(file.filename or "").suffix.lower().lstrip(".")
    if kind is None or extension not in ALLOWED.get(kind.mime, set()):
        raise HTTPException(415, "Type de fichier non autorisé.")

    file_id = str(uuid.uuid4())  # Python 3.14+ : uuid.uuid7() ; jamais le nom d'origine
    name = CONTROL_CHARS.sub("", Path(file.filename or "fichier").name)[:255]
    meta = {"id": file_id, "owner": user, "name": name, "size": len(content), "type": kind.mime, "createdAt": datetime.now(UTC).isoformat()}
    for target, data in ((UPLOAD_DIR / file_id, content), (UPLOAD_DIR / f"{file_id}.json", json.dumps(meta).encode())):
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as out:
            out.write(data)

    return {"id": file_id, "name": name, "size": meta["size"], "type": meta["type"]}


@app.get("/api/uploads/{file_id}")
async def download(file_id: str, user: User):
    try:
        file_id = str(uuid.UUID(file_id))  # identifiant strict : aucun chemin possible
    except ValueError:
        raise HTTPException(404, "Introuvable.") from None
    meta_file = UPLOAD_DIR / f"{file_id}.json"
    meta = json.loads(meta_file.read_text()) if meta_file.is_file() else None
    if meta is None or meta["owner"] != user:
        raise HTTPException(404, "Introuvable.")  # 404 plutôt que 403 : ne révèle pas l'existence
    return FileResponse(
        UPLOAD_DIR / meta["id"],
        media_type=meta["type"],
        filename=meta["name"],  # Content-Disposition: attachment (encodé RFC 5987)
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )


@app.exception_handler(HTTPException)
async def json_errors(request: Request, exc: HTTPException):
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code)
