import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * HTML riche « sûr par construction » : un petit analyseur à liste blanche construit des nœuds DOM avec
 * `createElement` / `createTextNode` (jamais `innerHTML`, `DOMParser` ni `insertHTML`, compatibles Trusted Types),
 * puis un sérialiseur produit une chaîne HTML propre. Seuls les éléments et l'attribut ci-dessous survivent :
 * `p`, `h2`–`h4`, `blockquote`, `pre`, `ul`, `ol`, `li`, `hr`, `br`, `strong`, `em`, `u`, `s`, `code`, `a[href]`
 * (http, https, mailto, tel ou adresse relative).
 *
 * Avec l'option `media` (désactivée par défaut), les images et vidéos sont acceptées, toujours sous la forme
 * `figure > img[src alt width height]` ou `figure > video[src poster title]` (+ `figcaption` facultative), avec des
 * adresses http(s) ou relatives seulement (jamais `data:` ni `javascript:`).
 */

/** Médias acceptés : `true`, ou un filtre d'adresses (par exemple, seulement votre domaine). */
export interface UiRichTextMediaPolicy {
  /** Adresse acceptée (après le filtre de schéma http, https ou relative). */
  allowUrl?: (url: string) => boolean;
}

/** Options d'analyse et de nettoyage. */
export interface UiRichTextOptions {
  /** Accepte images et vidéos (`figure`). Défaut : non. */
  media?: boolean | UiRichTextMediaPolicy;
}

/** Média à insérer (`createRichTextFigure`). */
export interface UiRichTextMedia {
  kind: 'image' | 'video';
  src: string;
  /** Texte alternatif (image) ou titre (vidéo). `''` : image décorative. */
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  /** Affiche de la vidéo. */
  poster?: string;
}

type MediaPolicy = UiRichTextMediaPolicy | null;

function mediaPolicy(options: UiRichTextOptions | undefined): MediaPolicy {
  const media = options?.media;
  return media ? (media === true ? {} : media) : null;
}

/** Type de bloc proposé par l'éditeur. */
export type UiRichTextBlock = 'p' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'pre';

const TEXT_BLOCKS = new Set(['p', 'h2', 'h3', 'h4']);
const LISTS = new Set(['ul', 'ol']);
const INLINE = new Set(['strong', 'em', 'u', 's', 'code', 'a']);
/** Blocs reconnus (pour le regroupement du texte et l'état de la barre d'outils). */
const BLOCK_NAMES = new Set([...TEXT_BLOCKS, ...LISTS, 'li', 'blockquote', 'pre', 'hr']);
const ALIASES: Record<string, string> = {
  b: 'strong',
  i: 'em',
  strike: 's',
  del: 's',
  ins: 'u',
  h1: 'h2',
  h5: 'h4',
  h6: 'h4',
};
/** Supprimés avec leur contenu. */
const DROPPED = new Set([
  'script', 'style', 'template', 'iframe', 'object', 'embed', 'svg', 'math', 'noscript', 'head', 'title', 'meta', 'link',
  'select', 'textarea', 'button', 'input', 'canvas', 'audio', 'video', 'img', 'picture', 'map', 'frame', 'frameset', 'applet',
]);
/** Conteneurs de bloc : deviennent un paragraphe s'ils ne contiennent que du texte, sinon sont retirés. */
const CONTAINERS = new Set([
  'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'figure', 'figcaption', 'address', 'center',
  'td', 'th', 'tr', 'dd', 'dt', 'details', 'summary', 'caption', 'fieldset', 'legend', 'form',
]);
/** Contenu brut ignoré jusqu'à la balise fermante (pas de balises à l'intérieur). */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'plaintext']);
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr']);
/** Ces débuts de balise ferment un paragraphe ouvert (règle HTML simplifiée). */
const CLOSES_P = new Set([...BLOCK_NAMES, ...CONTAINERS, 'table', 'dl', 'h1', 'h5', 'h6']);
const MAX_INPUT = 1_000_000;

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '­', laquo: '«', raquo: '»', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·', euro: '€', copy: '©',
  reg: '®', trade: '™', deg: '°', times: '×', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â',
  ccedil: 'ç', icirc: 'î', iuml: 'ï', ocirc: 'ô', ugrave: 'ù', ucirc: 'û', uuml: 'ü', oelig: 'œ', Eacute: 'É', Egrave: 'È',
  Agrave: 'À', Ccedil: 'Ç', OElig: 'Œ',
};

interface RawElement {
  name: string;
  href: string | null;
  /** Attributs des médias (`src`, `alt`, `width`, `height`, `poster`, `title`) ; vide pour les autres éléments. */
  attrs: Record<string, string>;
  children: RawNode[];
}

/** Éléments dont les attributs de média sont lus. */
const MEDIA_TAGS = new Set(['img', 'video', 'source']);
const MEDIA_ATTRS = new Set(['src', 'alt', 'width', 'height', 'poster', 'title']);
type RawNode = RawElement | string;

function decodeEntities(text: string): string {
  return text.replace(/&(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});/g, (match, code: string) => {
    if (code[0] !== '#') return ENTITIES[code] ?? match;
    const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    const valid = point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff);
    return valid ? String.fromCodePoint(point) : '�';
  });
}

/** Adresse de lien autorisée (http, https, mailto, tel, relative), ou `null`. */
export function safeRichTextUrl(value: string | null | undefined): string | null {
  // eslint-disable-next-line no-control-regex -- suppression volontaire des caractères de contrôle (« java\tscript: »)
  const url = (value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!url || url.length > 2048) return null;
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  // Tout autre schéma (javascript:, data:, vbscript:, file:…) est refusé ; un « : » après « / ? # » n'est pas un schéma.
  if (/^[^/?#]*:/.test(url)) return null;
  return url;
}

/** Attributs de média d'une balise (noms connus seulement, valeurs décodées). */
function mediaAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    const name = m[1].toLowerCase();
    if (MEDIA_ATTRS.has(name) && !(name in attrs)) attrs[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/** Adresse de média autorisée (http, https ou relative ; ni `data:`, ni `mailto:`…), ou `null`. */
export function safeRichTextMediaUrl(value: string | null | undefined, policy: UiRichTextMediaPolicy = {}): string | null {
  const url = safeRichTextUrl(value);
  if (!url || /^(mailto:|tel:)/i.test(url)) return null;
  return !policy.allowUrl || policy.allowUrl(url) ? url : null;
}

/** Dimension en pixels (entier de 1 à 10 000), ou `null`. */
function dimension(value: string | number | undefined): string | null {
  const n = typeof value === 'number' ? value : /^\s*\d{1,5}\s*$/.test(value ?? '') ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 10000 ? String(n) : null;
}

/**
 * Figure DOM sûre pour un média (adresse filtrée, attributs connus seulement), ou `null` si l'adresse est refusée.
 * Utilisée par l'éditeur pour insérer une image ou une vidéo choisie.
 */
export function createRichTextFigure(doc: Document, media: UiRichTextMedia, policy: UiRichTextMediaPolicy = {}): HTMLElement | null {
  const src = safeRichTextMediaUrl(media.src, policy);
  if (!src) return null;
  const figure = doc.createElement('figure');
  if (media.kind === 'image') {
    const img = doc.createElement('img');
    img.setAttribute('src', src);
    img.setAttribute('alt', media.alt.trim().slice(0, 300));
    const width = dimension(media.width);
    const height = dimension(media.height);
    if (width && height) {
      img.setAttribute('width', width);
      img.setAttribute('height', height);
    }
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    figure.append(img);
  } else {
    const video = doc.createElement('video');
    video.setAttribute('src', src);
    const poster = media.poster ? safeRichTextMediaUrl(media.poster, policy) : null;
    if (poster) video.setAttribute('poster', poster);
    if (media.alt.trim()) video.setAttribute('title', media.alt.trim().slice(0, 300));
    video.setAttribute('controls', '');
    video.setAttribute('preload', 'metadata');
    video.setAttribute('playsinline', '');
    figure.append(video);
  }
  const caption = media.caption?.trim();
  if (caption) {
    const figcaption = doc.createElement('figcaption');
    figcaption.textContent = caption.slice(0, 500);
    figure.append(figcaption);
  }
  return figure;
}

/** Premier élément brut d'un des noms donnés (parcours en profondeur). */
function findRaw(nodes: RawNode[], names: Set<string>): RawElement | null {
  for (const node of nodes) {
    if (typeof node === 'string') continue;
    if (names.has(node.name)) return node;
    const found = findRaw(node.children, names);
    if (found) return found;
  }
  return null;
}

const MEDIA_ELEMENTS = new Set(['img', 'video']);
/** Éléments qui deviennent une figure quand les médias sont acceptés. */
const FIGURE_SOURCES = new Set(['img', 'video', 'figure', 'picture']);

/** Figure d'un élément brut (`img`, `video`, `figure`, `picture`), ou `null`. */
function rawFigure(node: RawElement, doc: Document, policy: UiRichTextMediaPolicy): HTMLElement | null {
  const media = MEDIA_ELEMENTS.has(node.name) ? node : findRaw(node.children, MEDIA_ELEMENTS);
  if (!media) return null;
  const src = media.attrs['src'] || (media.name === 'video' ? findRaw(media.children, new Set(['source']))?.attrs['src'] : undefined);
  const caption = node.name === 'figure' ? findRaw(node.children, new Set(['figcaption'])) : null;
  const figure = createRichTextFigure(
    doc,
    {
      kind: media.name === 'img' ? 'image' : 'video',
      src: src ?? '',
      alt: media.name === 'img' ? (media.attrs['alt'] ?? '') : (media.attrs['title'] ?? ''),
      width: Number(dimension(media.attrs['width'])) || undefined,
      height: Number(dimension(media.attrs['height'])) || undefined,
      poster: media.attrs['poster'],
    },
    policy,
  );
  if (figure && caption) {
    const figcaption = doc.createElement('figcaption');
    figcaption.append(...convert(caption.children, 'inline', doc, null));
    if (hasText(figcaption)) figure.append(figcaption);
  }
  return figure;
}

/** Analyse une chaîne HTML en arbre brut (balises, attribut href, texte décodé). */
function tokenize(html: string): RawNode[] {
  const root: RawElement = { name: '#root', href: null, attrs: {}, children: [] };
  const stack: RawElement[] = [root];
  const top = () => stack[stack.length - 1];
  const text = (value: string) => {
    if (value) top().children.push(decodeEntities(value));
  };
  const closeTo = (name: string) => {
    for (let i = stack.length - 1; i > 0; i--) {
      if (stack[i].name === name) {
        stack.length = i;
        return;
      }
    }
  };
  const source = html.length > MAX_INPUT ? html.slice(0, MAX_INPUT) : html;
  const length = source.length;
  let i = 0;
  while (i < length) {
    const lt = source.indexOf('<', i);
    if (lt === -1) {
      text(source.slice(i));
      break;
    }
    text(source.slice(i, lt));
    if (source.startsWith('<!--', lt)) {
      const end = source.indexOf('-->', lt + 4);
      i = end === -1 ? length : end + 3;
      continue;
    }
    if (source[lt + 1] === '!' || source[lt + 1] === '?') {
      const end = source.indexOf('>', lt);
      i = end === -1 ? length : end + 1;
      continue;
    }
    const closing = source[lt + 1] === '/';
    const nameMatch = /[a-zA-Z][a-zA-Z0-9:-]*/y;
    nameMatch.lastIndex = lt + (closing ? 2 : 1);
    const found = nameMatch.exec(source);
    if (!found) {
      text('<');
      i = lt + 1;
      continue;
    }
    // Fin de balise : premier « > » hors guillemets.
    let j = nameMatch.lastIndex;
    let quote: string | null = null;
    for (; j < length; j++) {
      const c = source[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
    }
    if (j >= length) break; // balise non terminée : ignorée
    const name = found[0].toLowerCase();
    const attrs = source.slice(nameMatch.lastIndex, j);
    i = j + 1;
    if (closing) {
      closeTo(name);
      continue;
    }
    if (RAW_TEXT.has(name)) {
      const end = source.toLowerCase().indexOf(`</${name}`, i);
      i = end === -1 ? length : (source.indexOf('>', end) + 1 || length);
      continue;
    }
    if (CLOSES_P.has(name) && stack.some((el) => el.name === 'p')) closeTo('p');
    if (name === 'li') {
      // Un nouvel élément de liste ferme le précédent du même niveau.
      const lastList = Math.max(...['ul', 'ol'].map((n) => stack.map((el) => el.name).lastIndexOf(n)));
      const lastItem = stack.map((el) => el.name).lastIndexOf('li');
      if (lastItem > lastList) stack.length = lastItem;
    }
    let href: string | null = null;
    if (name === 'a') {
      const m = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(` ${attrs}`);
      href = m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? '') : null;
    }
    const element: RawElement = { name, href, attrs: MEDIA_TAGS.has(name) ? mediaAttributes(attrs) : {}, children: [] };
    top().children.push(element);
    if (!VOID.has(name) && !attrs.trimEnd().endsWith('/')) stack.push(element);
  }
  return root.children;
}

type Context = 'flow' | 'list' | 'item' | 'inline' | 'pre';

function hasText(node: Node): boolean {
  return (node.textContent ?? '').replace(/[\s\u00a0\u200b]/g, '') !== '';
}

function isBlockNode(node: Node): boolean {
  if (node.nodeType !== 1) return false;
  const name = (node as Element).tagName.toLowerCase();
  return BLOCK_NAMES.has(name) || name === 'figure';
}

/** Texte, ligne horizontale ou média. */
function hasContent(node: Node): boolean {
  return hasText(node) || node.nodeName === 'HR' || node.nodeName === 'FIGURE' || (node.nodeType === 1 && !!(node as Element).querySelector('hr, figure'));
}

/** Regroupe les suites de nœuds en ligne d'un contexte de flux dans des paragraphes. */
function groupFlow(doc: Document, nodes: Node[]): Node[] {
  const out: Node[] = [];
  let run: Node[] = [];
  const flush = () => {
    if (run.some((n) => hasText(n) || n.nodeName === 'BR')) {
      // Espaces de mise en forme du source en début / fin de paragraphe retirés.
      while (run.length && run[0].nodeType === 3 && !hasText(run[0])) run.shift();
      while (run.length && run[run.length - 1].nodeType === 3 && !hasText(run[run.length - 1])) run.pop();
      const p = doc.createElement('p');
      p.append(...run);
      out.push(p);
    }
    run = [];
  };
  for (const node of nodes) {
    if (isBlockNode(node)) {
      flush();
      out.push(node);
    } else {
      run.push(node);
    }
  }
  flush();
  return out;
}

function convert(nodes: RawNode[], ctx: Context, doc: Document, media: MediaPolicy): Node[] {
  const out: Node[] = [];
  for (const node of nodes) {
    if (typeof node === 'string') {
      out.push(doc.createTextNode(node));
      continue;
    }
    if (media && FIGURE_SOURCES.has(node.name) && (node.name !== 'figure' || findRaw(node.children, MEDIA_ELEMENTS))) {
      // Médias : uniquement au niveau des blocs (une image dans une liste ou une ligne de texte est retirée).
      if (ctx === 'flow') {
        const figure = rawFigure(node, doc, media);
        if (figure) out.push(figure);
      }
      continue;
    }
    if (DROPPED.has(node.name)) continue;
    const name = ALIASES[node.name] ?? node.name;
    if (name === 'br') {
      out.push(ctx === 'pre' ? doc.createTextNode('\n') : doc.createElement('br'));
      continue;
    }
    if (ctx === 'pre') {
      out.push(...convert(node.children, 'pre', doc, media));
      continue;
    }
    if (INLINE.has(name)) {
      const href = name === 'a' ? safeRichTextUrl(node.href) : null;
      if (name === 'a' && !href) {
        out.push(...convert(node.children, ctx === 'flow' || ctx === 'list' ? 'inline' : ctx, doc, media));
        continue;
      }
      const element = doc.createElement(name);
      if (href) element.setAttribute('href', href);
      element.append(...convert(node.children, 'inline', doc, media));
      if (element.childNodes.length) out.push(element);
      continue;
    }
    const block = BLOCK_NAMES.has(name) || CONTAINERS.has(name) || name === 'table' || name === 'dl';
    // Bloc dans un contexte en ligne : son contenu est gardé, séparé par un saut de ligne.
    if (ctx === 'inline' || (ctx === 'item' && !LISTS.has(name))) {
      const inner = convert(node.children, ctx, doc, media);
      if (block && out.length && inner.length && name !== 'li') out.push(doc.createElement('br'));
      out.push(...inner);
      continue;
    }
    if (LISTS.has(name)) {
      const list = doc.createElement(name);
      let pending: Node[] = [];
      const wrap = () => {
        if (pending.some(hasText)) {
          const li = doc.createElement('li');
          li.append(...pending);
          list.append(li);
        }
        pending = [];
      };
      for (const child of convert(node.children, 'list', doc, media)) {
        if (child.nodeName === 'LI') {
          wrap();
          list.append(child);
        } else {
          pending.push(child);
        }
      }
      wrap();
      if (list.childNodes.length) out.push(list);
      continue;
    }
    if (name === 'li') {
      const li = doc.createElement(ctx === 'list' ? 'li' : 'p');
      li.append(...convert(node.children, ctx === 'list' ? 'item' : 'inline', doc, media));
      if (hasText(li) || li.querySelector('ul, ol')) out.push(li);
      continue;
    }
    if (ctx === 'list') {
      // Élément inattendu dans une liste : son contenu sera placé dans un élément de liste.
      out.push(...convert(node.children, 'list', doc, media));
      continue;
    }
    if (name === 'pre') {
      const pre = doc.createElement('pre');
      pre.append(doc.createTextNode(convert(node.children, 'pre', doc, media).map((n) => n.textContent).join('')));
      if (hasText(pre)) out.push(pre);
      continue;
    }
    if (name === 'hr') {
      out.push(doc.createElement('hr'));
      continue;
    }
    if (TEXT_BLOCKS.has(name)) {
      // Médias dans un paragraphe (`<p><img></p>`, fréquent au collage) : le paragraphe est coupé autour des figures.
      const parts: RawNode[][] = [[]];
      const figures: (HTMLElement | null)[] = [];
      for (const child of node.children) {
        if (media && typeof child !== 'string' && FIGURE_SOURCES.has(child.name)) {
          figures.push(rawFigure(child, doc, media));
          parts.push([]);
        } else parts[parts.length - 1].push(child);
      }
      parts.forEach((part, i) => {
        const element = doc.createElement(name);
        element.append(...convert(part, 'inline', doc, media));
        if (parts.length === 1 || hasText(element)) out.push(element);
        const figure = figures[i];
        if (figure) out.push(figure);
      });
      continue;
    }
    if (name === 'blockquote') {
      const quote = doc.createElement('blockquote');
      quote.append(...groupFlow(doc, convert(node.children, 'flow', doc, media)));
      if (hasContent(quote)) out.push(quote);
      continue;
    }
    if (block) {
      // Conteneur (div, cellule…) : un paragraphe s'il ne contient que du texte, sinon son contenu.
      const inner = convert(node.children, 'flow', doc, media);
      if (inner.some(isBlockNode)) out.push(...groupFlow(doc, inner));
      else if (inner.some((n) => hasText(n) || n.nodeName === 'BR')) {
        const p = doc.createElement('p');
        p.append(...inner);
        out.push(p);
      }
      continue;
    }
    // Élément inconnu en ligne (span, font, sup…) : retiré, son contenu est gardé.
    out.push(...convert(node.children, ctx, doc, media));
  }
  return out;
}

/**
 * Construit un fragment DOM sûr à partir de HTML non fiable (analyse à liste blanche, sans `innerHTML`).
 * Les blocs vides sont retirés ; un texte sans bloc est placé dans des paragraphes.
 */
export function parseRichText(html: string | null | undefined, doc: Document = document, options?: UiRichTextOptions): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  if (!html) return fragment;
  fragment.append(...groupFlow(doc, convert(tokenize(html), 'flow', doc, mediaPolicy(options))));
  return fragment;
}

/** Arbre brut d'un nœud DOM existant (contenu de l'éditeur), pour le repasser dans la même normalisation. */
function fromDom(node: Node): RawNode[] {
  const out: RawNode[] = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) out.push((child as Text).data);
    else if (child.nodeType === 1) {
      const element = child as Element;
      const name = element.tagName.toLowerCase();
      const attrs: Record<string, string> = {};
      if (MEDIA_TAGS.has(name)) for (const attr of MEDIA_ATTRS) {
        const value = element.getAttribute(attr);
        if (value !== null) attrs[attr] = value;
      }
      out.push({ name, href: name === 'a' ? element.getAttribute('href') : null, attrs, children: fromDom(element) });
    }
  });
  return out;
}

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
const escapeAttr = (text: string) => escapeText(text).replace(/"/g, '&quot;');

function print(node: Node): string {
  if (node.nodeType === 3) return escapeText((node as Text).data);
  if (node.nodeType !== 1) return '';
  const element = node as Element;
  const name = element.tagName.toLowerCase();
  if (name === 'br' || name === 'hr') return `<${name}>`;
  if (name === 'img') {
    const size = element.hasAttribute('width') ? ` width="${escapeAttr(element.getAttribute('width') ?? '')}" height="${escapeAttr(element.getAttribute('height') ?? '')}"` : '';
    return `<img src="${escapeAttr(element.getAttribute('src') ?? '')}" alt="${escapeAttr(element.getAttribute('alt') ?? '')}"${size}>`;
  }
  if (name === 'video') {
    const poster = element.getAttribute('poster');
    const title = element.getAttribute('title');
    return `<video src="${escapeAttr(element.getAttribute('src') ?? '')}"${poster ? ` poster="${escapeAttr(poster)}"` : ''}${title ? ` title="${escapeAttr(title)}"` : ''} controls preload="metadata"></video>`;
  }
  const children = Array.from(element.childNodes);
  // Saut de ligne final d'un bloc (ajouté par les navigateurs) : sans effet, retiré.
  if (TEXT_BLOCKS.has(name) || name === 'li') {
    while (children.length > 1 && children[children.length - 1].nodeName === 'BR') children.pop();
  }
  const attrs = name === 'a' ? ` href="${escapeAttr(element.getAttribute('href') ?? '')}"` : '';
  return `<${name}${attrs}>${children.map(print).join('')}</${name}>`;
}

/** Contenu vide (aucun texte, aucune ligne horizontale). */
function isEmptyContent(nodes: Node[]): boolean {
  return !nodes.some(hasContent);
}

/** HTML propre d'un contenu DOM (éditeur) : mêmes règles que `parseRichText`. Chaîne vide si rien n'est saisi. */
export function serializeRichText(root: Node, doc: Document = document, options?: UiRichTextOptions): string {
  const nodes = groupFlow(doc, convert(fromDom(root), 'flow', doc, mediaPolicy(options)));
  // Paragraphes vides en fin de contenu (où l'éditeur place le curseur après une ligne ou une figure) : retirés.
  while (nodes.length > 1 && nodes[nodes.length - 1].nodeName === 'P' && !hasContent(nodes[nodes.length - 1])) nodes.pop();
  return isEmptyContent(nodes) ? '' : nodes.map(print).join('');
}

/**
 * Nettoie du HTML non fiable selon la liste blanche de l'éditeur (pour afficher ou réenregistrer côté client).
 * Le serveur doit refaire ce nettoyage : voir l'onglet « Côté serveur » de la documentation.
 */
export function sanitizeRichText(html: string | null | undefined, doc: Document = document, options?: UiRichTextOptions): string {
  const nodes = Array.from(parseRichText(html, doc, options).childNodes);
  return isEmptyContent(nodes) ? '' : nodes.map(print).join('');
}

/** Texte brut d'un HTML riche (un saut de ligne entre les blocs), pour un compteur, un aperçu ou une recherche. */
export function richTextToPlainText(html: string | null | undefined, doc: Document = document): string {
  const lines: string[] = [];
  const walk = (node: Node, line: string[]): void => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) line.push((child as Text).data);
      else if (child.nodeName === 'BR') line.push('\n');
      else if (isBlockNode(child) && child.nodeName !== 'LI' && !LISTS.has(child.nodeName.toLowerCase()) && child.nodeName !== 'BLOCKQUOTE') {
        lines.push(collect(child));
      } else if (child.nodeName === 'LI') lines.push(collect(child));
      else walk(child, line);
    });
  };
  const collect = (node: Node): string => {
    const line: string[] = [];
    walk(node, line);
    return line.join('');
  };
  const fragment = parseRichText(html, doc);
  fragment.childNodes.forEach((block) => {
    if (block.nodeName === 'P' || /^H\d$/.test(block.nodeName) || block.nodeName === 'PRE') lines.push(collect(block));
    else walk(block, []);
  });
  return lines.join('\n').replace(/\u00a0/g, ' ').trim();
}

/** Nombre de caractères visibles d'un HTML riche (sans balises). */
export function richTextLength(html: string | null | undefined): number {
  return richTextToPlainText(html).replace(/\n/g, '').length;
}

/**
 * Validateur Angular : texte visible de `max` caractères au plus (les balises ne comptent pas).
 * Erreur `maxlength` (`{ requiredLength, actualLength }`) : même message que `Validators.maxLength`.
 */
export function richTextMaxLength(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actualLength = richTextLength(typeof control.value === 'string' ? control.value : '');
    return actualLength > max ? { maxlength: { requiredLength: max, actualLength } } : null;
  };
}

/** @internal Bloc reconnu par l'éditeur (nom canonique), ou `null`. */
export function richTextBlockName(element: Element): string | null {
  const name = element.tagName.toLowerCase();
  const canonical = ALIASES[name] ?? name;
  return BLOCK_NAMES.has(canonical) ? canonical : CONTAINERS.has(name) ? 'p' : null;
}

/** @internal Nom canonique d'un élément en ligne (`b` → `strong`). */
export function richTextInlineName(element: Element): string {
  const name = element.tagName.toLowerCase();
  return ALIASES[name] ?? name;
}
