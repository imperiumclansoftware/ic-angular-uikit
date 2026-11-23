# settings.py (extrait) — Django 5.x / 6.x
# CSRF de Django réglé pour Angular : cookie XSRF-TOKEN lisible par JS, renvoyé dans l'en-tête X-XSRF-TOKEN.
CSRF_COOKIE_NAME = "XSRF-TOKEN"
CSRF_HEADER_NAME = "HTTP_X_XSRF_TOKEN"
CSRF_COOKIE_HTTPONLY = False  # Angular doit pouvoir le lire ; la session, elle, reste HttpOnly
CSRF_COOKIE_SAMESITE = "Strict"
CSRF_COOKIE_SECURE = True  # en HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
SECURE_CONTENT_TYPE_NOSNIFF = True

UPLOAD_DIR = BASE_DIR / "var" / "uploads"  # hors de STATIC_ROOT / MEDIA_ROOT servis directement
UPLOAD_MAX_SIZE = 5 * 1024 * 1024  # 5 Mo (limitez aussi client_max_body_size côté Nginx)
FILE_UPLOAD_MAX_MEMORY_SIZE = 2_621_440  # au-delà, Django écrit le fichier temporaire sur disque
