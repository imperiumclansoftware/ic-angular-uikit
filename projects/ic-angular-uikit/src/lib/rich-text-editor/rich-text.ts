import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
} from '@angular/core';
import { parseRichText } from './rich-text-html';

/**
 * Affiche du HTML riche (produit par `ui-rich-text-editor` ou venu d'un serveur) sans `innerHTML` : le contenu est
 * analysé avec la même liste blanche que l'éditeur et reconstruit nœud par nœud, compatible CSP + Trusted Types.
 * Scripts, styles, attributs d'événement, images et liens `javascript:` sont retirés.
 *
 * Les liens vers un autre site reçoivent `rel="noopener noreferrer nofollow ugc"` (contenu d'utilisateur).
 */
@Component({
  selector: 'ui-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ui-rich-text ui-prose' },
  template: ``,
  styleUrls: ['./prose.css'],
  styles: `.ui-rich-text { display: block; }`,
})
export class UiRichText {
  /** HTML à afficher (non fiable : il est nettoyé). */
  readonly html = input<string | null | undefined>('');
  /** Les liens vers un autre site s'ouvrent dans un nouvel onglet (`_blank`) ou dans le même (`_self`). */
  readonly externalLinks = input<'_self' | '_blank'>('_self');
  /** Valeur `rel` des liens vers un autre site. */
  readonly externalRel = input('noopener noreferrer nofollow ugc');

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const document = inject(DOCUMENT);
    effect(() => {
      const fragment = parseRichText(this.html(), document);
      const origin = document.location?.origin;
      fragment.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href') ?? '';
        let external = /^(https?:)?\/\//i.test(href);
        try {
          external = external && new URL(href, document.baseURI).origin !== origin;
        } catch {
          external = true;
        }
        if (!external) return;
        link.setAttribute('rel', this.externalRel());
        if (this.externalLinks() === '_blank') link.setAttribute('target', '_blank');
      });
      host.replaceChildren(fragment);
    });
  }
}
