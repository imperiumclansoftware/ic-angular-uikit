// server.mjs — Node.js 22.13+ (node:sqlite intégré), Express 5, sanitize-html 2
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import sanitizeHtml from 'sanitize-html';

const MAX_TEXT = 5000; // texte visible, sans balises

/** Même liste blanche que ui-rich-text-editor. */
const SANITIZE_OPTIONS = {
  allowedTags: ['p', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'ul', 'ol', 'li', 'hr', 'br', 'strong', 'em', 'u', 's', 'code', 'a'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  // Balise refusée : retirée, son texte gardé — sauf celles-ci, retirées avec leur contenu.
  disallowedTagsMode: 'discard',
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'template', 'iframe', 'object', 'svg', 'math', 'title', 'head'],
  transformTags: {
    b: 'strong',
    i: 'em',
    strike: 's',
    del: 's',
    h1: 'h2',
    h5: 'h4',
    h6: 'h4',
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: 'noopener noreferrer nofollow ugc' } }),
  },
};
// `rel` ajouté par transformTags : il doit aussi être autorisé.
SANITIZE_OPTIONS.allowedAttributes.a.push('rel');

fs.mkdirSync('var', { recursive: true, mode: 0o700 });
const db = new DatabaseSync('var/comments.db');
db.exec(`CREATE TABLE IF NOT EXISTS comment (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
)`);
db.exec('CREATE INDEX IF NOT EXISTS comment_owner ON comment (owner)');
const insert = db.prepare('INSERT INTO comment (id, owner, content, created_at) VALUES (?, ?, ?, ?)');
const listOwned = db.prepare('SELECT id, content, created_at FROM comment WHERE owner = ? ORDER BY created_at DESC LIMIT 50');

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

/** Texte visible d'un HTML déjà nettoyé. */
function visibleText(html) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;| /g, ' ').trim();
}

const router = express.Router();
router.use(csrf, requireUser, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/', express.json({ limit: '64kb', strict: true, type: 'application/json' }), (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ error: 'JSON attendu.' });
  const content = req.body?.content;
  if (typeof content !== 'string' || !content.trim()) return res.status(422).json({ error: 'content : texte HTML attendu.' });
  // Le HTML vient du navigateur : il est TOUJOURS nettoyé ici, même si l'éditeur l'a déjà fait.
  const html = sanitizeHtml(content, SANITIZE_OPTIONS);
  const text = visibleText(html);
  if (!text) return res.status(422).json({ error: 'Le commentaire est vide.' });
  if ([...text].length > MAX_TEXT) return res.status(422).json({ error: `${MAX_TEXT} caractères au plus.` });
  const id = crypto.randomUUID();
  insert.run(id, req.userId, html, new Date().toISOString());
  res.status(201).json({ id, content: html });
});

router.get('/', (req, res) => {
  res.json(listOwned.all(req.userId).map((row) => ({ id: row.id, content: row.content, createdAt: row.created_at })));
});

app.use('/api/comments', router);

// Corps illisible : JSON mal formé → 400, trop gros → 413 (sans détail interne).
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Contenu trop volumineux.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide.' });
  next(err);
});

app.listen(3000, () => console.log('API sur http://localhost:3000'));
