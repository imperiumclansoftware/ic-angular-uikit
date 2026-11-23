// server.mjs — Node.js 22+, Express 5, Multer 2, file-type 21
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const UPLOAD_DIR = path.resolve('var/uploads'); // hors du dossier public
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
/** Types acceptés (détectés sur le contenu) → extensions autorisées. SVG et HTML exclus. */
const ALLOWED = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

await fs.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o700 });
const app = express();

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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE, files: 1, fields: 5 } });

app.post('/api/uploads', csrf, requireUser, (req, res, next) => {
  upload.single('file')(req, res, async (error) => {
    try {
      if (error?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Fichier trop volumineux (5 Mo max).' });
      if (error) return res.status(400).json({ error: 'Envoi invalide.' });
      if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu (champ « file »).' });

      // Type réel, lu dans le contenu (jamais le Content-Type ni l'extension envoyés par le client).
      const detected = await fileTypeFromBuffer(req.file.buffer);
      const extensions = detected ? ALLOWED[detected.mime] : undefined;
      const extension = path.extname(req.file.originalname).slice(1).toLowerCase();
      if (!detected || !extensions || !extensions.includes(extension)) {
        return res.status(415).json({ error: 'Type de fichier non autorisé.' });
      }

      const id = crypto.randomUUID(); // nom de stockage : jamais le nom d'origine
      const name = path.basename(req.file.originalname).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255);
      const meta = { id, owner: req.userId, name, size: req.file.size, type: detected.mime, createdAt: new Date().toISOString() };
      await fs.writeFile(path.join(UPLOAD_DIR, id), req.file.buffer, { flag: 'wx', mode: 0o600 });
      await fs.writeFile(path.join(UPLOAD_DIR, `${id}.json`), JSON.stringify(meta), { flag: 'wx', mode: 0o600 });

      res.status(201).json({ id, name, size: meta.size, type: meta.type });
    } catch (e) {
      next(e);
    }
  });
});

// Téléchargement : uniquement par son propriétaire, en pièce jointe, sans interprétation par le navigateur.
app.get('/api/uploads/:id', csrf, requireUser, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).end();
  let meta;
  try {
    meta = JSON.parse(await fs.readFile(path.join(UPLOAD_DIR, `${req.params.id}.json`), 'utf8'));
  } catch {
    return res.status(404).end();
  }
  if (meta.owner !== req.userId) return res.status(404).end(); // 404 plutôt que 403 : ne révèle pas l'existence
  res.set({
    'Content-Type': meta.type,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  res.sendFile(path.join(UPLOAD_DIR, meta.id));
});

app.listen(3000, () => console.log('API sur http://localhost:3000'));
