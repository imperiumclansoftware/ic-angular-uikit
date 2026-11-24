// server.mjs — Node.js 22.13+ (node:sqlite intégré), Express 5, Multer 2, file-type 21.
// API de la bibliothèque de fichiers : contrat de uiHttpFileSource (ui-file-manager, ui-media-picker).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const STORAGE = path.resolve('var/files'); // hors du dossier public
const MAX_FILE = 20 * 1024 * 1024; // 20 Mo par fichier
const QUOTA = 500 * 1024 * 1024; // 500 Mo par utilisateur
/** Types acceptés, détectés dans le CONTENU du fichier (jamais d'après le nom ou l'en-tête du navigateur). SVG et HTML exclus (scripts). */
const ALLOWED = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'application/pdf': 'pdf',
};
const INLINE = /^(image|video|audio)\//;

fs.mkdirSync(STORAGE, { recursive: true, mode: 0o700 });
const db = new DatabaseSync('var/files.db');
db.exec(`CREATE TABLE IF NOT EXISTS node (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL, parent TEXT, kind TEXT NOT NULL, name TEXT NOT NULL, name_key TEXT NOT NULL,
  mime TEXT, size INTEGER, storage TEXT, modified_at TEXT NOT NULL
)`);
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS node_name ON node (owner, coalesce(parent, ''), name_key)");
const q = {
  get: db.prepare('SELECT * FROM node WHERE id = ? AND owner = ?'),
  children: db.prepare("SELECT * FROM node WHERE owner = ? AND coalesce(parent, '') = coalesce(?, '') ORDER BY kind DESC, name_key"),
  sameName: db.prepare("SELECT id FROM node WHERE owner = ? AND coalesce(parent, '') = coalesce(?, '') AND name_key = ? AND id <> ?"),
  insert: db.prepare('INSERT INTO node (id, owner, parent, kind, name, name_key, mime, size, storage, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  rename: db.prepare('UPDATE node SET name = ?, name_key = ?, modified_at = ? WHERE id = ? AND owner = ?'),
  move: db.prepare('UPDATE node SET parent = ?, modified_at = ? WHERE id = ? AND owner = ?'),
  remove: db.prepare('DELETE FROM node WHERE id = ? AND owner = ?'),
  usage: db.prepare('SELECT coalesce(sum(size), 0) AS used FROM node WHERE owner = ?'),
};

/** UUID v7 (horodaté, aléatoire cryptographique). */
function uuidv7() {
  const bytes = crypto.randomBytes(16);
  const ts = BigInt(Date.now());
  for (let i = 0; i < 6; i++) bytes[i] = Number((ts >> BigInt(8 * (5 - i))) & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Mêmes règles que validateFileName côté client. */
function cleanName(value) {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFC').trim();
  // eslint-disable-next-line no-control-regex
  if (!name || name.length > 120 || /[/\\:*?"<>|\u0000-\u001f]/.test(name) || name === '.' || name === '..') return null;
  return name;
}
const nameKey = (name) => name.normalize('NFC').toLowerCase();

function toEntry(row) {
  const entry = { id: row.id, name: row.name, kind: row.kind, modifiedAt: row.modified_at };
  if (row.kind === 'file') {
    Object.assign(entry, { mimeType: row.mime, size: row.size, url: `/api/files/${row.id}/content` });
    if (row.mime.startsWith('image/')) entry.thumbnailUrl = entry.url;
  }
  return entry;
}

/** Dossier de l'utilisateur (`null` : racine) ; `undefined` si inconnu ou appartenant à un autre. */
function ownedFolder(owner, id) {
  if (id === null || id === undefined || id === '') return null;
  if (typeof id !== 'string' || !UUID.test(id)) return undefined;
  const row = q.get.get(id, owner);
  return row?.kind === 'folder' ? row : undefined;
}

const app = express();
app.disable('x-powered-by');

/** À brancher sur votre authentification (session HttpOnly). Renvoie l'id de l'utilisateur ou null. */
function currentUserId(req) {
  return req.session?.userId ?? null;
}
function requireUser(req, res, next) {
  const userId = currentUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentification requise.' });
  req.userId = String(userId);
  next();
}
function cookie(req, name) {
  const match = (req.headers.cookie ?? '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}
/** CSRF « double submit » compatible Angular : cookie XSRF-TOKEN = en-tête X-XSRF-TOKEN. */
function csrf(req, res, next) {
  if (!cookie(req, 'XSRF-TOKEN')) res.cookie('XSRF-TOKEN', crypto.randomBytes(32).toString('base64url'), { sameSite: 'strict', secure: req.secure, path: '/' });
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = Buffer.from(cookie(req, 'XSRF-TOKEN'));
  const received = Buffer.from(String(req.get('X-XSRF-TOKEN') ?? ''));
  if (!expected.length || expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return res.status(403).json({ error: 'Jeton CSRF invalide.' });
  next();
}

const router = express.Router();
router.use(csrf, requireUser, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
const json = express.json({ limit: '32kb', type: 'application/json' });
const now = () => new Date().toISOString();

// Contenu d'un dossier + chemin depuis la racine.
router.get('/', (req, res) => {
  const folder = ownedFolder(req.userId, req.query.folder);
  if (folder === undefined) return res.status(404).json({ error: 'Dossier introuvable.' });
  const pathRows = [];
  for (let row = folder, depth = 0; row && depth < 64; row = row.parent ? q.get.get(row.parent, req.userId) : null, depth++) pathRows.unshift({ id: row.id, name: row.name });
  res.json({ items: q.children.all(req.userId, folder?.id ?? null).map(toEntry), path: [{ id: null, name: 'Racine' }, ...pathRows] });
});

router.post('/folders', json, (req, res) => {
  const name = cleanName(req.body?.name);
  if (!name) return res.status(422).json({ error: 'Nom invalide.' });
  const parent = ownedFolder(req.userId, req.body?.parentId);
  if (parent === undefined) return res.status(404).json({ error: 'Dossier introuvable.' });
  if (q.sameName.get(req.userId, parent?.id ?? null, nameKey(name), '')) return res.status(409).json({ error: `« ${name} » existe déjà dans ce dossier.` });
  const id = uuidv7();
  q.insert.run(id, req.userId, parent?.id ?? null, 'folder', name, nameKey(name), null, null, null, now());
  res.status(201).json(toEntry(q.get.get(id, req.userId)));
});

router.patch('/:id', json, (req, res) => {
  const row = UUID.test(req.params.id) ? q.get.get(req.params.id, req.userId) : undefined;
  if (!row) return res.status(404).json({ error: 'Élément introuvable.' });
  const name = cleanName(req.body?.name);
  if (!name) return res.status(422).json({ error: 'Nom invalide.' });
  if (q.sameName.get(req.userId, row.parent, nameKey(name), row.id)) return res.status(409).json({ error: `« ${name} » existe déjà dans ce dossier.` });
  q.rename.run(name, nameKey(name), now(), row.id, req.userId);
  res.json(toEntry(q.get.get(row.id, req.userId)));
});

/** Éléments de l'utilisateur désignés par `ids` : 422 si la liste est mal formée, 404 si un élément est inconnu (ou à un autre). */
function ownedNodes(owner, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every((id) => typeof id === 'string' && UUID.test(id))) return { status: 422, error: 'ids : 1 à 500 identifiants.' };
  const rows = [...new Set(ids)].map((id) => q.get.get(id, owner));
  return rows.every(Boolean) ? { rows } : { status: 404, error: 'Élément introuvable.' };
}

router.post('/move', json, (req, res) => {
  const { rows, status, error } = ownedNodes(req.userId, req.body?.ids);
  if (!rows) return res.status(status).json({ error });
  const target = ownedFolder(req.userId, req.body?.targetId);
  if (target === undefined) return res.status(404).json({ error: 'Dossier introuvable.' });
  // Jamais dans lui-même ni dans un de ses descendants.
  const moved = new Set(rows.map((r) => r.id));
  for (let row = target, depth = 0; row && depth < 64; row = row.parent ? q.get.get(row.parent, req.userId) : null, depth++) {
    if (moved.has(row.id)) return res.status(422).json({ error: 'Impossible de déplacer un dossier dans lui-même.' });
  }
  for (const row of rows) {
    if (q.sameName.get(req.userId, target?.id ?? null, row.name_key, row.id)) return res.status(409).json({ error: `« ${row.name} » existe déjà dans le dossier de destination.` });
  }
  db.exec('BEGIN');
  try {
    rows.forEach((row) => q.move.run(target?.id ?? null, now(), row.id, req.userId));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  res.status(204).end();
});

router.post('/delete', json, (req, res) => {
  const { rows, status, error } = ownedNodes(req.userId, req.body?.ids);
  if (!rows) return res.status(status).json({ error });
  // Descendants collectés d'abord (fichiers du disque compris), puis suppression.
  const all = [];
  const collect = (row) => {
    all.push(row);
    if (row.kind === 'folder') q.children.all(req.userId, row.id).forEach(collect);
  };
  rows.forEach(collect);
  db.exec('BEGIN');
  try {
    all.forEach((row) => q.remove.run(row.id, req.userId));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  all.filter((r) => r.storage).forEach((r) => fs.rm(path.join(STORAGE, r.storage), { force: true }, () => undefined));
  res.status(204).end();
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE, files: 1, fields: 4 } });
router.post('/upload', (req, res, next) =>
  upload.single('file')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Fichier trop volumineux (20 Mo au plus).' });
    if (err) return res.status(400).json({ error: 'Envoi invalide.' });
    next();
  }),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier.' });
    const parent = ownedFolder(req.userId, req.body?.folder);
    if (parent === undefined) return res.status(404).json({ error: 'Dossier introuvable.' });
    const detected = await fileTypeFromBuffer(req.file.buffer);
    const ext = detected && ALLOWED[detected.mime];
    if (!ext) return res.status(415).json({ error: 'Type de fichier non accepté.' });
    if (q.usage.get(req.userId).used + req.file.size > QUOTA) return res.status(413).json({ error: 'Espace de stockage plein.' });
    // Nom d'origine nettoyé, extension remplacée par celle du type réel, rendu unique dans le dossier.
    const base = (cleanName(req.file.originalname) ?? 'fichier').replace(/\.[^.]*$/, '').slice(0, 100) || 'fichier';
    let name = `${base}.${ext}`;
    for (let n = 2; q.sameName.get(req.userId, parent?.id ?? null, nameKey(name), ''); n++) name = `${base} (${n}).${ext}`;
    const id = uuidv7();
    fs.writeFileSync(path.join(STORAGE, id), req.file.buffer, { mode: 0o600 }); // nom de stockage = UUID, jamais le nom envoyé
    q.insert.run(id, req.userId, parent?.id ?? null, 'file', name, nameKey(name), detected.mime, req.file.size, id, now());
    res.status(201).json(toEntry(q.get.get(id, req.userId)));
  },
);

// Contenu : propriétaire seulement ; images / vidéos / audio affichés, le reste téléchargé.
router.get('/:id/content', (req, res) => {
  const row = UUID.test(req.params.id) ? q.get.get(req.params.id, req.userId) : undefined;
  if (!row || row.kind !== 'file') return res.status(404).json({ error: 'Fichier introuvable.' });
  res.set({
    'Content-Type': row.mime,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'private, max-age=300',
    'Content-Disposition': `${INLINE.test(row.mime) ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(row.name)}`,
  });
  // sendFile gère les requêtes partielles (Range) : lecture et déplacement dans les vidéos.
  res.sendFile(row.storage, { root: STORAGE, dotfiles: 'deny', headers: { 'Content-Type': row.mime } });
});

app.use('/api/files', router);
app.use((err, _req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Requête trop volumineuse.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide.' });
  next(err);
});

app.listen(3000, () => console.log('API sur http://localhost:3000'));
