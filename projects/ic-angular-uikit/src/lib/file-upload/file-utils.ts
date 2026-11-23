/** Taille : nombre d'octets, ou texte avec unité (`'500 Ko'`, `'5 MB'`, `'1,5 Go'`). */
export type UiFileSize = number | string;

const UNITS: Record<string, number> = {
  b: 1, o: 1, octet: 1, octets: 1,
  kb: 1024, ko: 1024, k: 1024,
  mb: 1024 ** 2, mo: 1024 ** 2, m: 1024 ** 2,
  gb: 1024 ** 3, go: 1024 ** 3, g: 1024 ** 3,
};

/** Convertit une taille (`5 * 1024 * 1024`, `'5 Mo'`, `'500KB'`) en octets ; `undefined` si absente ou invalide. */
export function parseFileSize(size: UiFileSize | null | undefined): number | undefined {
  if (size === null || size === undefined || size === '') return undefined;
  if (typeof size === 'number') return Number.isFinite(size) && size >= 0 ? size : undefined;
  const match = /^\s*([\d.,]+)\s*([a-zA-Z]*)\s*$/.exec(size);
  if (!match) return undefined;
  const value = Number(match[1].replace(',', '.'));
  const unit = UNITS[(match[2] || 'o').toLowerCase()];
  return Number.isFinite(value) && unit ? Math.round(value * unit) : undefined;
}

/** Affiche une taille en unités françaises : `1,5 Mo`, `820 Ko`, `12 o`. */
export function formatFileSize(bytes: number): string {
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const digits = i === 0 || value >= 10 ? 0 : 1;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value)} ${units[i]}`;
}

/** Jetons d'un attribut `accept` (`'image/*, .pdf'` → `['image/*', '.pdf']`). */
export function acceptTokens(accept: string | null | undefined): string[] {
  return (accept ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

/** Vérifie un fichier contre `accept` : extensions (`.pdf`), types MIME (`application/pdf`) et familles (`image/*`). */
export function matchesAccept(file: File, accept: string | null | undefined): boolean {
  const tokens = acceptTokens(accept);
  if (!tokens.length) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return !!type && type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

const FAMILY_LABELS: Record<string, string> = { image: 'images', video: 'vidéos', audio: 'fichiers audio', text: 'fichiers texte' };

/** Description lisible de `accept` : `'image/*,.pdf'` → `images ou PDF`. */
export function describeAccept(accept: string | null | undefined): string {
  const labels = acceptTokens(accept).map((token) => {
    if (token.startsWith('.')) return token.slice(1).toUpperCase();
    if (token.endsWith('/*')) return FAMILY_LABELS[token.slice(0, -2)] ?? token;
    const sub = token.split('/')[1] ?? token;
    return sub.replace(/^x-/, '').split(/[.+-]/).pop()?.toUpperCase() ?? token;
  });
  const unique = [...new Set(labels)];
  return unique.length <= 1 ? (unique[0] ?? '') : `${unique.slice(0, -1).join(', ')} ou ${unique[unique.length - 1]}`;
}
