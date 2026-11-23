import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CodeBlock } from './code-block';
import { CodeLanguage } from './highlight';

interface Inline {
  kind: 'text' | 'code' | 'strong';
  text: string;
}
type Block =
  | { kind: 'p'; inlines: Inline[] }
  | { kind: 'ul'; items: Inline[][] }
  | { kind: 'code'; code: string; language: CodeLanguage };

function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { kind: 'code', text: m[1] } : { kind: 'strong', text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** Paragraphe, éventuellement suivi d'une liste (lignes « - … », les lignes suivantes prolongent l'élément). */
function parseParagraph(para: string): Block[] {
  const blocks: Block[] = [];
  let text: string[] = [];
  let items: string[][] = [];
  const flushText = () => {
    const joined = text.join(' ').trim();
    if (joined) blocks.push({ kind: 'p', inlines: parseInline(joined) });
    text = [];
  };
  const flushList = () => {
    if (items.length) blocks.push({ kind: 'ul', items: items.map((lines) => parseInline(lines.join(' ').trim())) });
    items = [];
  };
  for (const raw of para.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[-*] /.test(line)) {
      flushText();
      items.push([line.slice(2)]);
    } else if (items.length) {
      items[items.length - 1].push(line);
    } else {
      text.push(line);
    }
  }
  flushText();
  flushList();
  return blocks;
}

/** Rendu d'un sous-ensemble de Markdown (paragraphes, listes, `code`, **gras**, blocs ```) issu des JSDoc, sans innerHTML. */
export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const parts = source.split(/```(\w*)\n([\s\S]*?)```/g);
  for (let i = 0; i < parts.length; i += 3) {
    for (const para of parts[i].split(/\n\s*\n/)) {
      blocks.push(...parseParagraph(para));
    }
    if (i + 2 < parts.length) {
      blocks.push({ kind: 'code', language: (parts[i + 1] || 'ts') as CodeLanguage, code: parts[i + 2] });
    }
  }
  return blocks;
}

@Component({
  selector: 'doc-markdown',
  imports: [CodeBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (block of blocks(); track $index) {
      @if (block.kind === 'p') {
        <p>@for (part of block.inlines; track $index) {@switch (part.kind) {@case ('code') {<code class="doc-inline-code">{{ part.text }}</code>} @case ('strong') {<strong>{{ part.text }}</strong>} @default {<ng-container>{{ part.text }}</ng-container>}}}</p>
      } @else if (block.kind === 'ul') {
        <ul>
          @for (item of block.items; track $index) {
            <li>@for (part of item; track $index) {@switch (part.kind) {@case ('code') {<code class="doc-inline-code">{{ part.text }}</code>} @case ('strong') {<strong>{{ part.text }}</strong>} @default {<ng-container>{{ part.text }}</ng-container>}}}</li>
          }
        </ul>
      } @else {
        <doc-code [code]="block.code" [language]="block.language" />
      }
    }
  `,
  styles: `
    :host { display: block; }
    p { margin: 0 0 var(--ui-space-2); }
    p:last-child, ul:last-child { margin-bottom: 0; }
    ul { margin: 0 0 var(--ui-space-2); padding-inline-start: var(--ui-space-5); }
    li + li { margin-top: var(--ui-space-1); }
    doc-code { margin: var(--ui-space-2) 0; }
  `,
})
export class Markdown {
  readonly text = input.required<string>();
  protected readonly blocks = computed(() => parseMarkdown(this.text()));
}
