<?php
// public/api/dashboards.php — PHP 8.2+ (PDO). Toutes les URL /api/dashboards/* sont routées vers ce script.
// Base : SQLite ici ; même code avec MySQL / PostgreSQL (changez seulement le DSN et la création de table).
declare(strict_types=1);

const MAX_BODY_BYTES = 65536;
/** Types de widgets connus de l'application (liste blanche). */
const WIDGET_TYPES = ['kpi', 'chart', 'tasks', 'note', 'goal'];
const ITEM_FIELDS = ['id', 'type', 'x', 'y', 'w', 'h', 'title', 'config'];

session_start(['cookie_httponly' => true, 'cookie_secure' => !empty($_SERVER['HTTPS']), 'cookie_samesite' => 'Lax', 'use_strict_mode' => true]);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function json(int $status, ?array $body = null): never
{
    http_response_code($status);
    if ($body !== null) {
        header('Content-Type: application/json');
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
    exit;
}

/** À brancher sur votre authentification : id de l'utilisateur connecté, ou null. */
function currentUserId(): ?string
{
    return isset($_SESSION['user_id']) ? (string) $_SESSION['user_id'] : null;
}

/** UUID v7 (horodaté, aléatoire cryptographique). */
function uuidV7(): string
{
    $bytes = substr(pack('J', (int) (microtime(true) * 1000)), 2, 6) . random_bytes(10);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x70);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

function isInt(mixed $v, int $min, int $max): bool
{
    return is_int($v) && $v >= $min && $v <= $max;
}

/** Valide la disposition décodée ; renvoie la liste des erreurs (vide si valide). */
function validateLayout(mixed $body): array
{
    if (!is_array($body) || array_is_list($body)) {
        return ['Objet JSON attendu.'];
    }
    $errors = [];
    $extra = array_diff(array_keys($body), ['version', 'columns', 'items']);
    if ($extra) $errors[] = 'Champs inconnus : ' . implode(', ', $extra) . '.';
    if (($body['version'] ?? null) !== 1) $errors[] = 'version doit valoir 1.';
    $columns = $body['columns'] ?? null;
    if (!isInt($columns, 1, 24)) $errors[] = 'columns : entier de 1 à 24.';
    $items = $body['items'] ?? null;
    if (!is_array($items) || !array_is_list($items) || count($items) > 50) {
        return [...$errors, 'items : tableau de 50 éléments au plus.'];
    }
    $ids = [];
    foreach ($items as $i => $item) {
        $at = "items[$i]";
        if (!is_array($item) || ($item !== [] && array_is_list($item))) { $errors[] = "$at : objet attendu."; continue; }
        $unknown = array_diff(array_keys($item), ITEM_FIELDS);
        if ($unknown) $errors[] = "$at : champs inconnus (" . implode(', ', $unknown) . ').';
        $id = $item['id'] ?? null;
        if (!is_string($id) || !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) $errors[] = "$at.id invalide.";
        elseif (isset($ids[$id])) $errors[] = "$at.id en double.";
        $ids[(string) $id] = true;
        if (!in_array($item['type'] ?? null, WIDGET_TYPES, true)) $errors[] = "$at.type inconnu.";
        if (!isInt($item['x'] ?? null, 0, 23) || !isInt($item['w'] ?? null, 1, 24) || (is_int($columns) && $item['x'] + $item['w'] > $columns)) {
            $errors[] = "$at : x / w hors de la grille.";
        }
        if (!isInt($item['y'] ?? null, 0, 1000) || !isInt($item['h'] ?? null, 1, 50)) $errors[] = "$at : y / h hors limites.";
        if (array_key_exists('title', $item)) {
            $title = $item['title'];
            if (!is_string($title) || mb_strlen($title) > 120 || preg_match('/[\x00-\x1F\x7F]/', $title)) $errors[] = "$at.title : texte de 120 caractères au plus.";
        }
        if (array_key_exists('config', $item)) {
            $config = $item['config'];
            $encoded = is_array($config) && ($config === [] || !array_is_list($config)) ? json_encode($config, 0, 5) : false;
            if ($encoded === false || strlen($encoded) > 8192) $errors[] = "$at.config : objet JSON, 8 Ko et 5 niveaux au plus.";
        }
    }
    return $errors;
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
if (!preg_match('#^/api/dashboards/([a-z0-9][a-z0-9-]{0,63})$#', (string) $path, $match)) {
    json(404, ['error' => 'Tableau de bord inconnu.']);
}
$key = $match[1];

$pdo = new PDO('sqlite:' . __DIR__ . '/../../var/dashboards.db', options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE TABLE IF NOT EXISTS dashboard_layout (
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, dashboard_key TEXT NOT NULL, layout TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE (owner, dashboard_key))');

// Requêtes préparées, toujours filtrées par propriétaire (session), jamais par une valeur du client.
switch ($method) {
    case 'GET':
        $select = $pdo->prepare('SELECT layout, updated_at FROM dashboard_layout WHERE owner = ? AND dashboard_key = ?');
        $select->execute([$userId, $key]);
        $row = $select->fetch(PDO::FETCH_ASSOC) ?: json(404, ['error' => 'Aucune disposition enregistrée.']);
        $layout = json_decode($row['layout'], false, 16, JSON_THROW_ON_ERROR);
        $layout->updatedAt = $row['updated_at'];
        json(200, (array) $layout);

    case 'PUT':
        if (!str_starts_with((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            json(415, ['error' => 'JSON attendu.']);
        }
        $raw = (string) file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
        if (strlen($raw) > MAX_BODY_BYTES) json(413, ['error' => 'Disposition trop volumineuse.']);
        try {
            $body = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            json(400, ['error' => 'JSON invalide.']);
        }
        $errors = validateLayout($body);
        if ($errors) json(422, ['error' => 'Disposition invalide.', 'details' => array_slice($errors, 0, 20)]);

        // Champs connus uniquement ; config vide réencodée en {} (et non []).
        $items = array_map(static function (array $item): array {
            $clean = array_intersect_key($item, array_flip(ITEM_FIELDS));
            if (isset($clean['config']) && $clean['config'] === []) $clean['config'] = new stdClass();
            return $clean;
        }, $body['items']);
        $layout = json_encode(['version' => 1, 'columns' => $body['columns'], 'items' => $items], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $updatedAt = (new DateTimeImmutable())->format(DATE_ATOM);
        $pdo->prepare('INSERT INTO dashboard_layout (id, owner, dashboard_key, layout, updated_at) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (owner, dashboard_key) DO UPDATE SET layout = excluded.layout, updated_at = excluded.updated_at')
            ->execute([uuidV7(), $userId, $key, $layout, $updatedAt]);
        json(200, ['updatedAt' => $updatedAt]);

    case 'DELETE':
        $pdo->prepare('DELETE FROM dashboard_layout WHERE owner = ? AND dashboard_key = ?')->execute([$userId, $key]);
        json(204);

    default:
        header('Allow: GET, PUT, DELETE');
        json(405, ['error' => 'Méthode non autorisée.']);
}
