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
};

const HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types angular angular#bundler",
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
  res.writeHead(200, { ...HEADERS, 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, host, () => console.log(`[serve] http://${host}:${port}/ → ${root}`));
