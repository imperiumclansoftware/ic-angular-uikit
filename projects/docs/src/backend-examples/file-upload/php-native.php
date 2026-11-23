<?php
// public/api/uploads.php — PHP 8.2+ (extension fileinfo). Toutes les URL /api/uploads* sont routées vers ce script.
// php.ini : upload_max_filesize = 5M, post_max_size = 6M, file_uploads = On
declare(strict_types=1);

const UPLOAD_DIR = __DIR__ . '/../../var/uploads'; // hors de la racine web
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
/** Types acceptés (détectés sur le contenu) → extensions autorisées. SVG et HTML exclus. */
const ALLOWED = [
    'image/png' => ['png'],
    'image/jpeg' => ['jpg', 'jpeg'],
    'image/webp' => ['webp'],
    'application/pdf' => ['pdf'],
];

session_start(['cookie_httponly' => true, 'cookie_secure' => !empty($_SERVER['HTTPS']), 'cookie_samesite' => 'Lax', 'use_strict_mode' => true]);
header('X-Content-Type-Options: nosniff');

function json(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

/** À brancher sur votre authentification : id de l'utilisateur connecté, ou null. */
function currentUserId(): ?string
{
    return isset($_SESSION['user_id']) ? (string) $_SESSION['user_id'] : null;
}

/** UUID v7 (horodaté, aléatoire cryptographique) pour nommer le fichier stocké. */
function uuidV7(): string
{
    $bytes = substr(pack('J', (int) (microtime(true) * 1000)), 2, 6) . random_bytes(10);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x70);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

// CSRF « double submit » compatible Angular : cookie XSRF-TOKEN = en-tête X-XSRF-TOKEN.
if (empty($_COOKIE['XSRF-TOKEN'])) {
    $_COOKIE['XSRF-TOKEN'] = '';
    setcookie('XSRF-TOKEN', rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='), [
        'path' => '/', 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS']), 'httponly' => false,
    ]);
}
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    $cookieToken = (string) $_COOKIE['XSRF-TOKEN'];
    $headerToken = (string) ($_SERVER['HTTP_X_XSRF_TOKEN'] ?? '');
    if ($cookieToken === '' || !hash_equals($cookieToken, $headerToken)) {
        json(403, ['error' => 'Jeton CSRF invalide.']);
    }
}

$userId = currentUserId() ?? json(401, ['error' => 'Authentification requise.']);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// ----- POST /api/uploads -----------------------------------------------------
if ($method === 'POST' && $path === '/api/uploads') {
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_SIZE + 1024 * 1024) {
        json(413, ['error' => 'Fichier trop volumineux (5 Mo max).']);
    }
    $file = $_FILES['file'] ?? null;
    if (!is_array($file) || is_array($file['error'])) {
        json(400, ['error' => 'Aucun fichier reçu (champ « file »).']);
    }
    if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $file['size'] > MAX_SIZE) {
        json(413, ['error' => 'Fichier trop volumineux (5 Mo max).']);
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        json(400, ['error' => 'Envoi invalide.']);
    }

    // Type réel lu dans le contenu (jamais $file['type'], fourni par le client).
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!isset(ALLOWED[$mime]) || !in_array($extension, ALLOWED[$mime], true)) {
        json(415, ['error' => 'Type de fichier non autorisé.']);
    }

    if (!is_dir(UPLOAD_DIR) && !mkdir(UPLOAD_DIR, 0700, true) && !is_dir(UPLOAD_DIR)) {
        json(500, ['error' => 'Stockage indisponible.']);
    }
    $id = uuidV7(); // nom de stockage : jamais le nom d'origine
    $name = mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', basename($file['name'])) ?? 'fichier', 0, 255);
    if (!move_uploaded_file($file['tmp_name'], UPLOAD_DIR . "/$id")) {
        json(500, ['error' => 'Stockage impossible.']);
    }
    chmod(UPLOAD_DIR . "/$id", 0600);
    $meta = ['id' => $id, 'owner' => $userId, 'name' => $name, 'size' => $file['size'], 'type' => $mime, 'createdAt' => date(DATE_ATOM)];
    file_put_contents(UPLOAD_DIR . "/$id.json", json_encode($meta, JSON_THROW_ON_ERROR), LOCK_EX);
    chmod(UPLOAD_DIR . "/$id.json", 0600);

    json(201, ['id' => $id, 'name' => $name, 'size' => $file['size'], 'type' => $mime]);
}

// ----- GET /api/uploads/{id} : par son propriétaire, en pièce jointe -----------------
if ($method === 'GET' && preg_match('#^/api/uploads/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$#', $path, $m)) {
    $metaFile = UPLOAD_DIR . "/{$m[1]}.json";
    $meta = is_file($metaFile) ? json_decode((string) file_get_contents($metaFile), true) : null;
    if (!is_array($meta) || $meta['owner'] !== $userId) {
        json(404, ['error' => 'Introuvable.']); // 404 plutôt que 403 : ne révèle pas l'existence
    }
    header('Content-Type: ' . $meta['type']);
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($meta['name']));
    header('Content-Length: ' . filesize(UPLOAD_DIR . "/{$meta['id']}"));
    header('Cache-Control: private, no-store');
    readfile(UPLOAD_DIR . "/{$meta['id']}");
    exit;
}

json(404, ['error' => 'Introuvable.']);
