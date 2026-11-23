import { safeRichTextUrl } from '../rich-text-editor/rich-text-html';

/**
 * Rendu Markdown des réponses d'IA, construit nœud par nœud (`createElement` / `createTextNode`, jamais
 * `innerHTML`) : le HTML éventuellement présent dans le texte est affiché comme du texte, les liens sont filtrés
 * (http, https, mailto, tel, relatifs). Tolérant au flux : un bloc de code ou un tableau en cours d'écriture
 * s'affiche correctement.
 *
 * Pris en charge : paragraphes, titres `#`, gras `**`, italique `*` / `_`, barré `~~`, code `` ` `` et blocs
 * ```` ``` ````, listes `-` / `*` / `1.` (imbriquées par indentation), citations `>`, tableaux `| a | b |`, lignes `---`,
 * liens `[texte](url)` et adresses `https://…` nues.
 */

/** Options du rendu. */
export interface UiChatMarkdownOptions {
  /** Niveau du titre `#` (les suivants en découlent ; défaut : 3, sous le titre de la page et de la conversation). */
  headingOffset?: number;
  /** Bouton « Copier » sur les blocs de code (défaut : vrai). */
  copyButtons?: boolean;
}

const INLINE = /(`+)([\s\S]*?[^`])\1(?!`)|\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|~~([^~\n]+?)~~|\*([^*\s][^*\n]*?)\*|(?<![\w])_([^_\s][^_\n]*?)_(?![\w])|!?\[([^\]\n]*)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+"[^"]*")?\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

/** `links` faux à l'intérieur d'un lien : pas de lien imbriqué (et pas de récursion sur une adresse nue). */
function appendInline(doc: Document, parent: Node, text: string, links = true): void {
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) parent.appendChild(doc.createTextNode(text.slice(last, match.index)));
    last = match.index + match[0].length;
    const [whole, , code, bold, bold2, strike, italic, italic2, linkText, linkUrl, bare] = match;
    if (code !== undefined) {
      const el = doc.createElement('code');
      el.textContent = code.replace(/^ (.*) $/, '$1');
      parent.appendChild(el);
    } else if (bold !== undefined || bold2 !== undefined) {
      const el = doc.createElement('strong');
      appendInline(doc, el, bold ?? bold2, links);
      parent.appendChild(el);
    } else if (strike !== undefined) {
      const el = doc.createElement('s');
      appendInline(doc, el, strike, links);
      parent.appendChild(el);
    } else if (italic !== undefined || italic2 !== undefined) {
      const el = doc.createElement('em');
      appendInline(doc, el, italic ?? italic2, links);
      parent.appendChild(el);
    } else if (linkUrl !== undefined) {
      const href = safeRichTextUrl(linkUrl);
      // Image Markdown : jamais chargée (CSP, pistage) ; seul son texte alternatif est affiché.
      if (!href || !links || whole.startsWith('!')) {
        appendInline(doc, parent, linkText ?? '', links);
        continue;
      }
      parent.appendChild(link(doc, href, linkText || href));
    } else if (bare !== undefined) {
      const href = safeRichTextUrl(bare);
      parent.appendChild(href && links ? link(doc, href, bare) : doc.createTextNode(bare));
    }
  }
  if (last < text.length) parent.appendChild(doc.createTextNode(text.slice(last)));
}

function link(doc: Document, href: string, text: string): HTMLAnchorElement {
  const a = doc.createElement('a');
  a.setAttribute('href', href);
  if (/^https?:/i.test(href)) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer nofollow ugc');
  }
  appendInline(doc, a, text, false);
  return a;
}

interface ListItem {
  indent: number;
  ordered: boolean;
  start: number;
  text: string[];
  children: ListItem[];
}

const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

/** Construit le DOM d'un texte Markdown. */
export function renderChatMarkdown(markdown: string, doc: Document = document, options: UiChatMarkdownOptions = {}): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  const offset = Math.min(6, Math.max(1, options.headingOffset ?? 3));
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  const flush = () => {
    if (!paragraph.length) return;
    const p = doc.createElement('p');
    paragraph.forEach((line, i) => {
      // Saut de ligne simple conservé (les IA s'en servent beaucoup).
      if (i) p.appendChild(doc.createElement('br'));
      appendInline(doc, p, line);
    });
    fragment.appendChild(p);
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^\s*(```+|~~~+)\s*([\w#+.-]*)\s*$/.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      let j = i + 1;
      while (j < lines.length && !new RegExp(`^\\s*${fence[1][0] === '`' ? '`' : '~'}{${fence[1].length},}\\s*$`).test(lines[j])) code.push(lines[j++]);
      fragment.appendChild(codeBlock(doc, code.join('\n'), fence[2], options.copyButtons ?? true, j >= lines.length));
      i = j;
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flush();
      const level = Math.min(6, offset + heading[1].length - 1);
      const h = doc.createElement(`h${level}`);
      appendInline(doc, h, heading[2]);
      fragment.appendChild(h);
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      fragment.appendChild(doc.createElement('hr'));
      continue;
    }
    if (/^\s*>/.test(line)) {
      flush();
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quoted.push(lines[i++].replace(/^\s*>\s?/, ''));
      i--;
      const blockquote = doc.createElement('blockquote');
      blockquote.appendChild(renderChatMarkdown(quoted.join('\n'), doc, options));
      fragment.appendChild(blockquote);
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      flush();
      const head = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : null));
      const table = doc.createElement('table');
      const thead = doc.createElement('thead');
      const headRow = doc.createElement('tr');
      head.forEach((cell, c) => {
        const th = doc.createElement('th');
        th.setAttribute('scope', 'col');
        if (aligns[c]) th.style.textAlign = aligns[c] as string;
        appendInline(doc, th, cell);
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = doc.createElement('tbody');
      let j = i + 2;
      for (; j < lines.length && lines[j].includes('|') && lines[j].trim(); j++) {
        const tr = doc.createElement('tr');
        splitRow(lines[j]).slice(0, head.length).forEach((cell, c) => {
          const td = doc.createElement('td');
          if (aligns[c]) td.style.textAlign = aligns[c] as string;
          appendInline(doc, td, cell);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      // Tableau large : défilement horizontal dans un conteneur focalisable (clavier).
      const wrapper = doc.createElement('div');
      wrapper.className = 'ui-chat-md__table';
      wrapper.setAttribute('tabindex', '0');
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', `Tableau : ${head.join(', ').slice(0, 80)}`);
      wrapper.appendChild(table);
      fragment.appendChild(wrapper);
      i = j - 1;
      continue;
    }
    if (LIST_ITEM.test(line)) {
      flush();
      const items: ListItem[] = [];
      while (i < lines.length) {
        const current = lines[i];
        const match = LIST_ITEM.exec(current);
        if (match) {
          items.push({
            indent: match[1].replace(/\t/g, '    ').length,
            ordered: /\d/.test(match[2]),
            start: parseInt(match[2], 10) || 1,
            text: [match[3]],
            children: [],
          });
        } else if (current.trim() && /^\s{2,}\S/.test(current) && items.length) {
          items[items.length - 1].text.push(current.trim());
        } else if (!current.trim() && i + 1 < lines.length && LIST_ITEM.test(lines[i + 1])) {
          // ligne vide entre deux éléments : même liste
        } else {
          break;
        }
        i++;
      }
      i--;
      fragment.appendChild(buildList(doc, nest(items)));
      continue;
    }
    paragraph.push(line.trim());
  }
  flush();
  return fragment;
}

/** Imbrication par indentation. */
function nest(items: ListItem[]): ListItem[] {
  const roots: ListItem[] = [];
  const stack: ListItem[] = [];
  for (const item of items) {
    while (stack.length && stack[stack.length - 1].indent >= item.indent) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(item);
    else roots.push(item);
    stack.push(item);
  }
  return roots;
}

function buildList(doc: Document, items: ListItem[]): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  let list: HTMLElement | null = null;
  for (const item of items) {
    const tag = item.ordered ? 'ol' : 'ul';
    if (!list || list.tagName.toLowerCase() !== tag) {
      list = doc.createElement(tag);
      if (item.ordered && item.start !== 1) list.setAttribute('start', String(item.start));
      fragment.appendChild(list);
    }
    const li = doc.createElement('li');
    item.text.forEach((text, i) => {
      if (i) li.appendChild(doc.createElement('br'));
      appendInline(doc, li, text);
    });
    if (item.children.length) li.appendChild(buildList(doc, item.children));
    list.appendChild(li);
  }
  return fragment;
}

function codeBlock(doc: Document, code: string, language: string, copy: boolean, open: boolean): HTMLElement {
  const figure = doc.createElement('div');
  figure.className = 'ui-chat-md__code';
  const header = doc.createElement('div');
  header.className = 'ui-chat-md__code-head';
  const label = doc.createElement('span');
  label.textContent = language || 'code';
  header.appendChild(label);
  if (copy && !open) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'ui-chat-md__copy';
    button.textContent = 'Copier';
    button.setAttribute('aria-label', `Copier le code${language ? ` ${language}` : ''}`);
    button.dataset['code'] = code;
    header.appendChild(button);
  }
  const pre = doc.createElement('pre');
  pre.setAttribute('tabindex', '0');
  const codeEl = doc.createElement('code');
  if (language) codeEl.setAttribute('data-language', language);
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  figure.append(header, pre);
  return figure;
}

/** Texte brut d'un Markdown (annonces aux lecteurs d'écran, copie sans balisage). */
export function chatMarkdownToText(markdown: string, doc: Document = document): string {
  const fragment = renderChatMarkdown(markdown, doc, { copyButtons: false });
  const parts: string[] = [];
  fragment.childNodes.forEach((node) => parts.push((node.textContent ?? '').trim()));
  return parts.filter(Boolean).join('\n');
}
