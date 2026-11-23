/**
 * Logique pure de la grille du tableau de bord : collisions, tassement, place libre, validation des données
 * reçues d'un serveur. Sans dépendance à Angular (testable et réutilisable côté serveur Node).
 */

/** Configuration propre à un widget (JSON sérialisable). */
export type UiWidgetConfig = Record<string, unknown>;

/** Un widget placé sur la grille. */
export interface UiDashboardItem<C extends object = UiWidgetConfig> {
  /** Identifiant unique dans le tableau de bord (`[A-Za-z0-9_-]`, 64 caractères max). */
  id: string;
  /** Type de widget (clé d'une `UiWidgetDefinition`). */
  type: string;
  /** Colonne de départ (0 = première). */
  x: number;
  /** Ligne de départ (0 = première). */
  y: number;
  /** Largeur en colonnes. */
  w: number;
  /** Hauteur en lignes. */
  h: number;
  /** Titre choisi par l'utilisateur (sinon celui de la définition). */
  title?: string;
  /** Réglages du widget. */
  config?: Partial<C>;
}

/** Disposition sérialisable, à enregistrer telle quelle côté serveur. */
export interface UiDashboardLayout {
  /** Version du format (pour migrer plus tard). */
  version: 1;
  /** Nombre de colonnes de la grille. */
  columns: number;
  /** Widgets placés. */
  items: UiDashboardItem[];
}

/** Bornes de taille d'un type de widget. */
export interface UiWidgetSizeLimits {
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

type Box = Pick<UiDashboardItem, 'x' | 'y' | 'w' | 'h'>;

/** Les deux rectangles se chevauchent. */
export function itemsOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Ordre de lecture : ligne puis colonne (sert aussi d'ordre du DOM, donc de tabulation). */
export function sortByPosition<T extends Box>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Borne la taille et la position d'un élément dans la grille. */
export function clampItem<T extends UiDashboardItem>(item: T, columns: number, limits: UiWidgetSizeLimits = {}): T {
  const int = (v: number, fallback: number) => (Number.isFinite(v) ? Math.round(v) : fallback);
  const maxW = Math.min(columns, Math.max(1, limits.maxW ?? columns));
  const minW = Math.min(maxW, Math.max(1, limits.minW ?? 1));
  const maxH = Math.max(1, limits.maxH ?? 50);
  const minH = Math.min(maxH, Math.max(1, limits.minH ?? 1));
  const w = Math.min(maxW, Math.max(minW, int(item.w, minW)));
  const h = Math.min(maxH, Math.max(minH, int(item.h, minH)));
  const x = Math.min(columns - w, Math.max(0, int(item.x, 0)));
  const y = Math.max(0, int(item.y, 0));
  return { ...item, x, y, w, h };
}

/**
 * Place `anchorId` à sa position et pousse vers le bas les éléments qu'il recouvre (en cascade),
 * puis tasse la grille vers le haut si `compact`.
 */
export function resolveLayout<T extends UiDashboardItem>(items: readonly T[], anchorId: string | null, compact = true): T[] {
  const anchor = anchorId ? items.find((item) => item.id === anchorId) : undefined;
  const placed: T[] = anchor ? [anchor] : [];
  for (const item of sortByPosition(items.filter((i) => i !== anchor))) {
    let y = item.y;
    for (;;) {
      const blockers = placed.filter((p) => itemsOverlap({ ...item, y }, p));
      if (blockers.length === 0) break;
      y = Math.max(...blockers.map((p) => p.y + p.h));
    }
    placed.push({ ...item, y });
  }
  return compact ? compactLayout(placed) : sortByPosition(placed);
}

/** Remonte chaque élément aussi haut que possible (gravité verticale), sans changer les colonnes. */
export function compactLayout<T extends UiDashboardItem>(items: readonly T[]): T[] {
  const done: T[] = [];
  for (const item of sortByPosition(items)) {
    let y = item.y;
    while (y > 0 && !done.some((p) => itemsOverlap({ ...item, y: y - 1 }, p))) y--;
    done.push({ ...item, y });
  }
  return sortByPosition(done);
}

/** Déplace / redimensionne un élément et réorganise les autres. */
export function moveItem<T extends UiDashboardItem>(
  items: readonly T[],
  id: string,
  change: Partial<Box>,
  columns: number,
  limits: UiWidgetSizeLimits = {},
  compact = true,
): T[] {
  const next = items.map((item) => (item.id === id ? clampItem({ ...item, ...change }, columns, limits) : item));
  return resolveLayout(next, id, compact);
}

/** Première place libre (de haut en bas, de gauche à droite) pour un élément de `w × h`. */
export function findFreeSpot(items: readonly Box[], w: number, h: number, columns: number): { x: number; y: number } {
  const width = Math.min(Math.max(1, w), columns);
  for (let y = 0; ; y++) {
    for (let x = 0; x <= columns - width; x++) {
      if (!items.some((item) => itemsOverlap({ x, y, w: width, h }, item))) return { x, y };
    }
  }
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/** Options de `sanitizeDashboardLayout`. */
export interface UiDashboardSanitizeOptions {
  /** Nombre de colonnes de la grille. */
  columns: number;
  /**
   * Types de widgets connus et leurs bornes de taille (les autres sont écartés) : objet `{ type: bornes }`,
   * ou directement la liste des `UiWidgetDefinition`.
   */
  types: Readonly<Record<string, UiWidgetSizeLimits>> | readonly (UiWidgetSizeLimits & { type: string })[];
  /** Nombre maximal de widgets (défaut : 50). */
  maxItems?: number;
}

/**
 * Valide une disposition venue de l'extérieur (serveur, stockage) : objet `UiDashboardLayout` ou tableau d'éléments.
 * Écarte les éléments invalides ou de type inconnu, les doublons, le surplus ; borne tailles et positions ;
 * ne garde que des réglages « objet simple » ; résout les chevauchements. Ne lève jamais d'exception.
 */
export function sanitizeDashboardLayout(raw: unknown, options: UiDashboardSanitizeOptions): UiDashboardItem[] {
  const types: Readonly<Record<string, UiWidgetSizeLimits>> = Array.isArray(options.types)
    ? Object.fromEntries((options.types as readonly (UiWidgetSizeLimits & { type: string })[]).map((d) => [d.type, d]))
    : (options.types as Readonly<Record<string, UiWidgetSizeLimits>>);
  const list = Array.isArray(raw) ? raw : isPlainObject(raw) && Array.isArray(raw['items']) ? raw['items'] : [];
  const seen = new Set<string>();
  const items: UiDashboardItem[] = [];
  for (const entry of list) {
    if (items.length >= (options.maxItems ?? 50)) break;
    if (!isPlainObject(entry)) continue;
    const { id, type, x, y, w, h, title, config } = entry;
    if (typeof id !== 'string' || !ID.test(id) || seen.has(id)) continue;
    if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(types, type)) continue;
    if (![x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    seen.add(id);
    const item: UiDashboardItem = clampItem({ id, type, x: x as number, y: y as number, w: w as number, h: h as number }, options.columns, types[type]);
    if (typeof title === 'string' && title.trim()) item.title = title.trim().slice(0, 120);
    if (isPlainObject(config)) item.config = config;
    items.push(item);
  }
  return resolveLayout(items, null);
}
