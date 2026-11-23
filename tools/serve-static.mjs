// Sert dist/docs-proxy/browser (build en mode watch) avec repli SPA et les en-têtes de deploy/nginx.conf.
// Utilisé derrière le proxy code-server /proxy/<port>/ qui retire le préfixe : le build doit avoir baseHref "/proxy/<port>/".
// Usage : node tools/serve-static.mjs [port] [host]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Dossier distinct de dist/docs pour qu'un `npm run build` ne vienne pas écraser le build en watch.
const root = join(dirname(fileURLToPath(import.meta.url)), '../dist/docs-proxy/browser');
const port = Number(process.argv[2] ?? 4220);
const host = process.argv[3] ?? '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
};

const HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types angular angular#bundler",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
};

createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  let file = normalize(join(root, path));
  if (!file.startsWith(root + sep) && file !== root) {
    res.writeHead(403).end();
    return;
  }
  const isFile = existsSync(file) && statSync(file).isFile();
  if (!isFile) {
    // Fichier statique manquant → 404 ; route de l'application → index.html (repli SPA).
    if (extname(path)) {
      res.writeHead(404).end();
      return;
    }
    file = join(root, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '2' }).end('Build en cours…');
      return;
    }
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const size = statSync(file).size;
  // Requêtes partielles (Range) : nécessaires pour se déplacer dans un fichier audio / vidéo.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { ...HEADERS, 'Content-Range': `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, { ...HEADERS, 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...HEADERS, 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size });
  createReadStream(file).pipe(res);
}).listen(port, host, () => console.log(`[serve] http://${host}:${port}/ → ${root}`));
