/**
 * Export des données d'une table : CSV, Excel (.xlsx) et JSON, sans dépendance.
 * Le classeur Excel est un vrai fichier Office Open XML (ZIP sans compression), ouvert sans avertissement par
 * Excel, LibreOffice et Numbers.
 */

/** Format d'export. */
export type UiTableExportFormat = 'csv' | 'xlsx' | 'json';

/** Lignes exportées : toutes les lignes filtrées et triées, ou seulement la page affichée. */
export type UiTableExportScope = 'all' | 'page';

/** Tableau à exporter : en-têtes, clés de colonnes et valeurs (une ligne par tableau). */
export interface UiTableExportData {
  headers: readonly string[];
  keys: readonly string[];
  rows: readonly (readonly unknown[])[];
}

/** Réglages de l'export. */
export interface UiTableExportOptions {
  /** Séparateur CSV (défaut `;`, attendu par Excel en français ; `,` pour un CSV international). */
  csvSeparator?: string;
  /** Séparateur décimal des nombres en CSV (défaut : `,` si le séparateur est `;`, sinon `.`). */
  decimalSeparator?: string;
  /** Marque d'ordre UTF-8 en tête du CSV, pour qu'Excel lise les accents (défaut : vrai). */
  bom?: boolean;
  /** Libellés des booléens en CSV (défaut : `['Oui', 'Non']`). */
  booleanLabels?: readonly [string, string];
  /** Nom de la feuille Excel (défaut : « Données »). */
  sheetName?: string;
}

const MIME: Record<UiTableExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  json: 'application/json;charset=utf-8',
};

/** Type MIME d'un format d'export. */
export function tableExportMime(format: UiTableExportFormat): string {
  return MIME[format];
}

/** Valeur exportable : `null`, nombre, booléen, date valide ou texte. */
function normalize(value: unknown): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (Array.isArray(value)) return value.map((v) => normalize(v) ?? '').map(String).join(', ');
  return String(value);
}

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

/** Date locale lisible par les tableurs : `AAAA-MM-JJ`, avec l'heure si elle n'est pas minuit. */
function formatDate(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return hasTime(date) ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` : day;
}

function hasTime(date: Date): boolean {
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
}

/**
 * Neutralise l'injection de formules (CSV injection) : un texte commençant par `=`, `+`, `-`, `@`, tabulation ou
 * retour chariot serait exécuté comme une formule par le tableur ; il est préfixé d'une apostrophe.
 */
export function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** Texte CSV (lignes séparées par CRLF, champs entre guillemets si nécessaire). */
export function tableToCsv(data: UiTableExportData, options: UiTableExportOptions = {}): string {
  const separator = options.csvSeparator ?? ';';
  const decimal = options.decimalSeparator ?? (separator === ';' ? ',' : '.');
  const [yes, no] = options.booleanLabels ?? ['Oui', 'Non'];
  const field = (value: unknown, header = false): string => {
    const v = normalize(value);
    let text: string;
    if (v === null) text = '';
    else if (typeof v === 'number') text = decimal === '.' ? String(v) : String(v).replace('.', decimal);
    else if (typeof v === 'boolean') text = v ? yes : no;
    else if (v instanceof Date) text = formatDate(v);
    else text = header ? v : neutralizeFormula(v);
    if (header) text = neutralizeFormula(text);
    return /["\r\n]/.test(text) || text.includes(separator) || /^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [data.headers.map((h) => field(h, true)).join(separator), ...data.rows.map((row) => row.map((v) => field(v)).join(separator))];
  return (options.bom === false ? '' : '﻿') + lines.join('\r\n') + '\r\n';
}

/** JSON : tableau d'objets indexés par clé de colonne (dates `AAAA-MM-JJ`, ou ISO 8601 complet si elles ont une heure). */
export function tableToJson(data: UiTableExportData): string {
  const objects = data.rows.map((row) => {
    const object: Record<string, unknown> = {};
    data.keys.forEach((key, i) => {
      const v = normalize(row[i]);
      // Une date sans heure reste le jour affiché (toISOString la décalerait vers la veille à l'est de Greenwich).
      object[key] = v instanceof Date ? (hasTime(v) ? v.toISOString() : formatDate(v)) : v;
    });
    return object;
  });
  return JSON.stringify(objects, null, 2) + '\n';
}

// ---------------------------------------------------------------------------------------------------------------
// Excel (.xlsx)

/** Caractères interdits en XML 1.0 retirés, puis échappement. */
function xml(text: string): string {
  return text
    .replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Lettres de colonne Excel (0 → A, 26 → AA). */
export function columnLetter(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

/** Numéro de série Excel d'une date (heure locale). */
function excelSerial(date: Date): number {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  return utc / 86_400_000 + 25_569;
}

function sheetName(name: string | undefined): string {
  const clean = (name ?? 'Données').replace(/[[\]:*?/\\]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31);
  return clean || 'Données';
}

const MAX_CELL = 32_767;

function sheetXml(data: UiTableExportData): string {
  const widths = data.headers.map((h) => Math.min(60, Math.max(8, h.length + 2)));
  const cell = (ref: string, value: unknown, col: number, header: boolean): string => {
    const v = header ? String(value ?? '') : normalize(value);
    if (v === null || v === '') return '';
    if (typeof v === 'number') {
      widths[col] = Math.max(widths[col], Math.min(60, String(v).length + 2));
      return `<c r="${ref}"><v>${v}</v></c>`;
    }
    if (typeof v === 'boolean') return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
    if (v instanceof Date) {
      const time = hasTime(v);
      widths[col] = Math.max(widths[col], time ? 18 : 12);
      return `<c r="${ref}" s="${time ? 3 : 2}"><v>${excelSerial(v)}</v></c>`;
    }
    const text = v.slice(0, MAX_CELL);
    widths[col] = Math.max(widths[col], Math.min(60, Math.max(...text.split('\n').map((l) => l.length)) + 2));
    // Texte en ligne (jamais une formule) : aucune injection possible dans le classeur.
    return `<c r="${ref}" t="inlineStr"${header ? ' s="1"' : ''}><is><t xml:space="preserve">${xml(text)}</t></is></c>`;
  };
  const rows = [data.headers, ...data.rows].map((row, r) => {
    const cells = data.headers.map((_, c) => cell(`${columnLetter(c)}${r + 1}`, row[c], c, r === 0)).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  });
  const last = `${columnLetter(Math.max(0, data.headers.length - 1))}${data.rows.length + 1}`;
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    (cols ? `<cols>${cols}</cols>` : '') +
    `<sheetData>${rows.join('')}</sheetData>` +
    (data.headers.length ? `<autoFilter ref="A1:${last}"/>` : '') +
    '</worksheet>'
  );
}

const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="yyyy\\-mm\\-dd\\ hh:mm"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/** Classeur Excel (.xlsx) d'une feuille : en-tête en gras et figé, filtre automatique, dates et nombres typés. */
export function tableToXlsx(data: UiTableExportData, options: UiTableExportOptions = {}): Uint8Array {
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const files: [string, string][] = [
    [
      '[Content_Types].xml',
      head +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    ],
    [
      '_rels/.rels',
      head +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      'xl/workbook.xml',
      head +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${rel}">` +
        `<sheets><sheet name="${xml(sheetName(options.sheetName))}" sheetId="1" r:id="rId1"/></sheets>` +
        (data.headers.length
          ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${sheetName(options.sheetName).replace(/'/g, "''")}'!$A$1:$${columnLetter(data.headers.length - 1)}$${data.rows.length + 1}</definedName></definedNames>`
          : '') +
        '</workbook>',
    ],
    [
      'xl/_rels/workbook.xml.rels',
      head +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    ],
    ['xl/styles.xml', STYLES],
    ['xl/worksheets/sheet1.xml', sheetXml(data)],
  ];
  return zipStore(files.map(([name, text]) => [name, new TextEncoder().encode(text)]));
}

// ---------------------------------------------------------------------------------------------------------------
// ZIP (méthode « stored », sans compression)

let crcTable: Uint32Array | null = null;

/** CRC-32 (polynôme ZIP). */
export function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Archive ZIP non compressée (suffisant pour un classeur ; noms UTF-8). */
export function zipStore(files: readonly (readonly [string, Uint8Array])[]): Uint8Array {
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of files) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // noms en UTF-8
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + end.length);
  let position = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, position);
    position += part.length;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------

/** Nom de fichier sûr : `base-AAAA-MM-JJ.ext` (caractères interdits des systèmes de fichiers retirés). */
export function tableExportFilename(base: string, format: UiTableExportFormat, date = new Date()): string {
  const clean =
    base
      .normalize('NFC')
      .replace(/[\\/:*?"<>|\p{Cc}]+/gu, ' ')
      .replace(/\s+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 80) || 'export';
  return `${clean}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.${format}`;
}

/** Contenu du fichier pour un format. */
export function tableExportContent(format: UiTableExportFormat, data: UiTableExportData, options: UiTableExportOptions = {}): string | Uint8Array {
  return format === 'csv' ? tableToCsv(data, options) : format === 'xlsx' ? tableToXlsx(data, options) : tableToJson(data);
}

/** Propose le téléchargement d'un fichier généré dans le navigateur (lien `blob:` temporaire). */
export function downloadFile(doc: Document, content: string | Uint8Array, type: string, filename: string): void {
  const view = doc.defaultView;
  if (!view?.URL?.createObjectURL) return;
  const blob = new Blob([content as BlobPart], { type });
  const url = view.URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  doc.body.appendChild(link);
  link.click();
  link.remove();
  view.setTimeout(() => view.URL.revokeObjectURL(url), 1000);
}
