// server.mjs — Node.js 22.13+ (module node:sqlite intégré), Express 5
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';

/** Types de widgets connus de l'application (liste blanche). */
const WIDGET_TYPES = new Set(['kpi', 'chart', 'tasks', 'note', 'goal']);
const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ITEM_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ITEM_FIELDS = ['id', 'type', 'x', 'y', 'w', 'h', 'title', 'config'];

fs.mkdirSync('var', { recursive: true, mode: 0o700 });
const db = new DatabaseSync('var/dashboards.db');
db.exec(`CREATE TABLE IF NOT EXISTS dashboard_layout (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  dashboard_key TEXT NOT NULL,
  layout TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (owner, dashboard_key)
)`);
// Requêtes paramétrées, toujours filtrées par propriétaire.
const findOwned = db.prepare('SELECT layout, updated_at FROM dashboard_layout WHERE owner = ? AND dashboard_key = ?');
const upsert = db.prepare(`INSERT INTO dashboard_layout (id, owner, dashboard_key, layout, updated_at) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (owner, dashboard_key) DO UPDATE SET layout = excluded.layout, updated_at = excluded.updated_at`);
const removeOwned = db.prepare('DELETE FROM dashboard_layout WHERE owner = ? AND dashboard_key = ?');

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
  if (!cookie(req, 'XSRF-TOKEN')) {
    res.cookie('XSRF-TOKEN', crypto.randomBytes(32).toString('base64url'), { sameSite: 'strict', secure: req.secure, path: '/' });
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = Buffer.from(cookie(req, 'XSRF-TOKEN'));
  const received = Buffer.from(String(req.get('X-XSRF-TOKEN') ?? ''));
  if (!expected.length || expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(403).json({ error: 'Jeton CSRF invalide.' });
  }
  next();
}

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const depth = (v) => (isPlainObject(v) || Array.isArray(v) ? 1 + Math.max(0, ...Object.values(v).map(depth)) : 0);
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/** Valide la disposition reçue. Renvoie { value } (champs connus uniquement) ou { errors }. */
function validateLayout(body) {
  if (!isPlainObject(body)) return { errors: ['Objet JSON attendu.'] };
  const errors = [];
  const { version, columns, items, ...extra } = body;
  if (Object.keys(extra).length) errors.push(`Champs inconnus : ${Object.keys(extra).join(', ')}.`);
  if (version !== 1) errors.push('version doit valoir 1.');
  if (!isInt(columns, 1, 24)) errors.push('columns : entier de 1 à 24.');
  if (!Array.isArray(items) || items.length > 50) return { errors: [...errors, 'items : tableau de 50 éléments au plus.'] };
  const ids = new Set();
  items.forEach((item, i) => {
    const at = `items[${i}]`;
    if (!isPlainObject(item)) return errors.push(`${at} : objet attendu.`);
    const unknown = Object.keys(item).filter((k) => !ITEM_FIELDS.includes(k));
    if (unknown.length) errors.push(`${at} : champs inconnus (${unknown.join(', ')}).`);
    if (typeof item.id !== 'string' || !ITEM_ID.test(item.id)) errors.push(`${at}.id invalide.`);
    else if (ids.has(item.id)) errors.push(`${at}.id en double.`);
    ids.add(item.id);
    if (!WIDGET_TYPES.has(item.type)) errors.push(`${at}.type inconnu.`);
    if (!isInt(item.x, 0, 23) || !isInt(item.w, 1, 24) || item.x + item.w > columns) errors.push(`${at} : x / w hors de la grille.`);
    if (!isInt(item.y, 0, 1000) || !isInt(item.h, 1, 50)) errors.push(`${at} : y / h hors limites.`);
    if ('title' in item && (typeof item.title !== 'string' || item.title.length > 120 || /[\x00-\x1F\x7F]/.test(item.title))) {
      errors.push(`${at}.title : texte de 120 caractères au plus.`);
    }
    if ('config' in item && (!isPlainObject(item.config) || depth(item.config) > 5 || JSON.stringify(item.config).length > 8192)) {
      errors.push(`${at}.config : objet JSON, 8 Ko et 5 niveaux au plus.`);
    }
  });
  if (errors.length) return { errors };
  const clean = items.map((item) => Object.fromEntries(ITEM_FIELDS.filter((k) => k in item).map((k) => [k, item[k]])));
  return { value: { version: 1, columns, items: clean } };
}

const router = express.Router();
router.use(csrf, requireUser, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.param('key', (req, res, next, key) => (KEY.test(key) ? next() : res.status(404).json({ error: 'Tableau de bord inconnu.' })));

router.get('/:key', (req, res) => {
  const row = findOwned.get(req.userId, req.params.key);
  if (!row) return res.status(404).json({ error: 'Aucune disposition enregistrée.' });
  res.json({ ...JSON.parse(row.layout), updatedAt: row.updated_at });
});

router.put('/:key', express.json({ limit: '64kb', strict: true, type: 'application/json' }), (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'JSON attendu.' });
  const { value, errors } = validateLayout(req.body);
  if (errors) return res.status(422).json({ error: 'Disposition invalide.', details: errors.slice(0, 20) });
  const updatedAt = new Date().toISOString();
  upsert.run(crypto.randomUUID(), req.userId, req.params.key, JSON.stringify(value), updatedAt);
  res.json({ updatedAt });
});

router.delete('/:key', (req, res) => {
  removeOwned.run(req.userId, req.params.key);
  res.status(204).end();
});

app.use('/api/dashboards', router);

// Erreurs de lecture du corps : JSON mal formé → 400, trop gros → 413 (sans détail interne).
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Disposition trop volumineuse.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide.' });
  next(err);
});

app.listen(3000, () => console.log('API sur http://localhost:3000'));
