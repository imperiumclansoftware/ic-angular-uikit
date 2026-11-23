/** Opérateurs des filtres texte. */
export type UiTextOperator = 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith' | 'empty' | 'notEmpty';
/** Opérateurs des filtres nombre. */
export type UiNumberOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'empty' | 'notEmpty';
/** Opérateurs des filtres date (dont des périodes relatives à aujourd'hui). */
export type UiDateOperator =
  | 'between'
  | 'on'
  | 'before'
  | 'after'
  | 'today'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'thisYear'
  | 'empty'
  | 'notEmpty';
export type UiFilterOperator = UiTextOperator | UiNumberOperator | UiDateOperator;

/** Filtre d'une colonne de `ui-table`. */
export type UiTableFilter =
  /**
   * Texte. Simple : « contient ». Avancé (`advanced: true` ou `operators`) : choix de l'opérateur
   * (commence par, finit par, égal à…).
   */
  | { type: 'text'; placeholder?: string; advanced?: boolean; operators?: readonly UiTextOperator[] }
  /** Liste de choix ; sans `options`, elles sont déduites des valeurs de la colonne. */
  | { type: 'select'; options?: readonly { value: unknown; label: string }[]; placeholder?: string }
  /** Nombre. Simple : bornes min / max. Avancé : =, ≠, >, ≥, <, ≤, entre, vide. */
  | { type: 'number'; advanced?: boolean; operators?: readonly UiNumberOperator[] }
  /** Date. Simple : entre deux dates. Avancé : le, avant, après, aujourd'hui, 7 / 30 derniers jours, ce mois-ci… */
  | { type: 'date'; advanced?: boolean; operators?: readonly UiDateOperator[] }
  /** Oui / non. */
  | { type: 'boolean'; trueLabel?: string; falseLabel?: string };

/** Valeur d'un filtre `number` simple. */
export interface UiTableRange {
  min?: number | null;
  max?: number | null;
}

/**
 * Condition d'un filtre avancé (ou d'un filtre date) : opérateur et valeur(s).
 * `between` utilise `value` (début / min) et `to` (fin / max) ; les dates sont au format `AAAA-MM-JJ`.
 */
export interface UiTableCondition {
  op: UiFilterOperator;
  value?: string | number | null;
  to?: string | number | null;
}

/** Valeurs des filtres, par clé de colonne (texte, valeur choisie, `UiTableRange`, `UiTableCondition`, booléen). */
export type UiTableFilters = Readonly<Record<string, unknown>>;

/** Libellés français des opérateurs. */
export const UI_FILTER_OPERATOR_LABELS: Record<UiFilterOperator, string> = {
  contains: 'Contient',
  notContains: 'Ne contient pas',
  equals: 'Égal à',
  notEquals: 'Différent de',
  startsWith: 'Commence par',
  endsWith: 'Finit par',
  empty: 'Est vide',
  notEmpty: "N'est pas vide",
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: 'Entre',
  on: 'Le',
  before: 'Avant le',
  after: 'Après le',
  today: "Aujourd'hui",
  last7: '7 derniers jours',
  last30: '30 derniers jours',
  thisMonth: 'Ce mois-ci',
  thisYear: 'Cette année',
};

/** Opérateurs disponibles par type de filtre (ordre d'affichage). */
export const UI_FILTER_OPERATORS = {
  text: ['contains', 'notContains', 'equals', 'notEquals', 'startsWith', 'endsWith', 'empty', 'notEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'notEmpty'],
  date: ['between', 'on', 'before', 'after', 'today', 'last7', 'last30', 'thisMonth', 'thisYear', 'empty', 'notEmpty'],
} as const satisfies Record<'text' | 'number' | 'date', readonly UiFilterOperator[]>;

/** Opérateurs sans valeur à saisir. */
const NO_VALUE: ReadonlySet<UiFilterOperator> = new Set(['empty', 'notEmpty', 'today', 'last7', 'last30', 'thisMonth', 'thisYear']);

/** L'opérateur demande-t-il une valeur (`between` : deux) ? */
export function operatorArity(op: UiFilterOperator): 0 | 1 | 2 {
  return NO_VALUE.has(op) ? 0 : op === 'between' ? 2 : 1;
}

/** Normalise un texte pour une comparaison insensible à la casse et aux accents. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Texte affiché pour une valeur de cellule. */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

/** Jour local `AAAA-MM-JJ` d'une date (`Date`, chaîne ISO ou timestamp), `null` si invalide. */
export function toDayKey(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === 'number') date = new Date(value);
  else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value; // déjà un jour
  else if (typeof value === 'string') date = new Date(value);
  else return null;
  if (isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftDays(day: Date, days: number): Date {
  const copy = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isCondition(value: unknown): value is UiTableCondition {
  return typeof value === 'object' && value !== null && 'op' in value;
}

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && !isFinite(v));
}

/** Un filtre est-il actif ? */
export function isFilterActive(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (isCondition(value)) {
    const arity = operatorArity(value.op);
    return arity === 0 || hasValue(value.value) || (arity === 2 && hasValue(value.to));
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    const range = value as UiTableRange;
    if ('min' in range || 'max' in range) return isFinite(range.min ?? NaN) || isFinite(range.max ?? NaN);
  }
  return true;
}

function isEmptyCell(cell: unknown): boolean {
  return cell === null || cell === undefined || (typeof cell === 'string' && cell.trim() === '');
}

function matchText(cell: unknown, condition: UiTableCondition): boolean {
  const text = normalizeText(displayValue(cell));
  const v = normalizeText(String(condition.value ?? ''));
  switch (condition.op) {
    case 'contains': return text.includes(v);
    case 'notContains': return !text.includes(v);
    case 'equals': return text === v;
    case 'notEquals': return text !== v;
    case 'startsWith': return text.startsWith(v);
    case 'endsWith': return text.endsWith(v);
    default: return true;
  }
}

function matchNumber(cell: unknown, condition: UiTableCondition): boolean {
  const n = typeof cell === 'number' ? cell : Number(cell);
  if (isEmptyCell(cell) || !isFinite(n)) return false;
  const v = Number(condition.value);
  const to = Number(condition.to);
  switch (condition.op) {
    case 'eq': return n === v;
    case 'neq': return n !== v;
    case 'gt': return n > v;
    case 'gte': return n >= v;
    case 'lt': return n < v;
    case 'lte': return n <= v;
    case 'between': return (!hasValue(condition.value) || n >= v) && (!hasValue(condition.to) || n <= to);
    default: return true;
  }
}

function matchDate(cell: unknown, condition: UiTableCondition, now: Date): boolean {
  const day = toDayKey(cell);
  if (!day) return false;
  const today = toDayKey(now) as string;
  const from = toDayKey(condition.value);
  const to = toDayKey(condition.to);
  switch (condition.op) {
    case 'on': return !from || day === from;
    case 'before': return !from || day < from;
    case 'after': return !from || day > from;
    case 'between': return (!from || day >= from) && (!to || day <= to);
    case 'today': return day === today;
    case 'last7': return day <= today && day >= (toDayKey(shiftDays(now, -6)) as string);
    case 'last30': return day <= today && day >= (toDayKey(shiftDays(now, -29)) as string);
    case 'thisMonth': return day.slice(0, 7) === today.slice(0, 7);
    case 'thisYear': return day.slice(0, 4) === today.slice(0, 4);
    default: return true;
  }
}

/**
 * La valeur d'une cellule satisfait-elle le filtre ? Accepte les valeurs simples (texte = « contient »,
 * `{ min, max }` = « entre ») et les conditions avancées `{ op, value, to }`.
 */
export function matchesFilter(filter: UiTableFilter, cell: unknown, filterValue: unknown, now: Date = new Date()): boolean {
  if (!isFilterActive(filterValue)) return true;
  if (isCondition(filterValue)) {
    if (filterValue.op === 'empty') return isEmptyCell(cell);
    if (filterValue.op === 'notEmpty') return !isEmptyCell(cell);
  }
  switch (filter.type) {
    case 'text':
      return matchText(cell, isCondition(filterValue) ? filterValue : { op: 'contains', value: String(filterValue) });
    case 'select':
      // Options fournies : comparaison des valeurs ; options déduites : comparaison des textes affichés.
      return filter.options ? Object.is(cell, filterValue) || cell === filterValue : displayValue(cell) === filterValue;
    case 'number': {
      if (isCondition(filterValue)) return matchNumber(cell, filterValue);
      const range = filterValue as UiTableRange;
      return matchNumber(cell, { op: 'between', value: range.min ?? null, to: range.max ?? null });
    }
    case 'date':
      return matchDate(cell, isCondition(filterValue) ? filterValue : { op: 'on', value: String(filterValue) }, now);
    case 'boolean':
      return Boolean(cell) === filterValue;
  }
}

/** Tous les mots de la recherche figurent-ils dans le texte ? */
export function matchesSearch(text: string, search: string): boolean {
  const words = normalizeText(search).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeText(text);
  return words.every((word) => haystack.includes(word));
}

/** Valeurs distinctes (texte affiché), triées, pour un filtre `select` sans options. */
export function distinctOptions(values: readonly unknown[]): { value: string; label: string }[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return [...new Set(values.map(displayValue).filter((v) => v !== ''))].sort(collator.compare).map((v) => ({ value: v, label: v }));
}
