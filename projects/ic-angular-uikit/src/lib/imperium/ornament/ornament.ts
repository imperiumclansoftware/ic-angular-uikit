import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Motif d'ornement : coin à volutes, frise centrale, fleuron, losange héraldique. */
export type UiOrnamentKind = 'corner' | 'knot' | 'flourish' | 'crest';

/**
 * Ornement vectoriel (arabesques) des composants Imperium : SVG en trait, couleur `--ui-ornament-color` (or antique
 * dans le thème `imperium-dark`, couleur principale ailleurs). Toujours décoratif (`aria-hidden`).
 *
 * - `corner` : coin à volutes (haut-gauche ; retournez-le en CSS pour les autres coins) ;
 * - `knot` : nœud central de séparateur (volutes et losange) ;
 * - `flourish` : fleuron symétrique (au-dessus d'un titre) ;
 * - `crest` : losange héraldique.
 *
 * ```html
 * <ui-ornament kind="flourish" style="width: 8rem" />
 * ```
 * @cssprop --ui-ornament-color - Couleur du trait.
 * @category Imperium
 */
@Component({
  selector: 'ui-ornament',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-ornament', 'aria-hidden': 'true', '[class]': "'ui-ornament--' + kind()" },
  template: `
    @switch (kind()) {
      @case ('corner') {
        <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1.5 54.5V15Q1.5 1.5 15 1.5H54.5" stroke-width="1.7" />
          <path d="M6 54.5V18.5Q6 6 18.5 6H54.5" stroke-width="0.7" opacity=".5" />
          <path d="M11 11c8.5-3 17.5 1.5 16.5 9.5-.7 6-8.4 7.2-10.2 2.6-1.3-3.4 2-6.2 4.8-4.4" stroke-width="1.5" />
          <path d="M27 18.5c5.5 0 9.5-2.6 13-6.5 2.4-2.7 6-2.3 6.3.6.2 2-2.3 3-3.4 1.4" stroke-width="1.2" />
          <path d="M18.5 27c0 5.5-2.6 9.5-6.5 13-2.7 2.4-2.3 6 .6 6.3 2 .2 3-2.3 1.4-3.4" stroke-width="1.2" />
          <path d="M21 21c5.5 1.6 9.2 5.6 10.4 11.4-5.8-1-9.8-4.9-10.4-11.4z" fill="currentColor" fill-opacity=".22" stroke-width="1" />
          <path d="M5 .6l4.4 4.4L5 9.4.6 5z" fill="currentColor" stroke="none" />
        </svg>
      }
      @case ('knot') {
        <svg viewBox="0 0 64 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path d="M0 12c6 0 9-5 15-5 4 0 5 3 3 5M64 12c-6 0-9-5-15-5-4 0-5 3-3 5" stroke-width="1.2" />
          <path d="M0 12c6 0 9 5 15 5 4 0 5-3 3-5M64 12c-6 0-9 5-15 5-4 0-5-3-3-5" stroke-width="1.2" />
          <path d="M32 3l9 9-9 9-9-9z" stroke-width="1.3" />
          <path d="M32 8l4 4-4 4-4-4z" fill="currentColor" stroke="none" />
        </svg>
      }
      @case ('flourish') {
        <svg viewBox="0 0 120 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path d="M60 12c-8-8-20-9-28-3-5 4-3 10 2 9 4-1 3-6 0-5M60 12c8-8 20-9 28-3 5 4 3 10-2 9-4-1-3-6 0-5" stroke-width="1.2" />
          <path d="M60 12c-12 6-30 8-56 0M60 12c12 6 30 8 56 0" stroke-width=".9" opacity=".7" />
          <path d="M60 6l4 6-4 6-4-6z" fill="currentColor" stroke="none" />
        </svg>
      }
      @case ('crest') {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linejoin="round">
          <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" stroke-width="1.3" />
          <path d="M12 6.5 17.5 12 12 17.5 6.5 12z" fill="currentColor" stroke="none" />
        </svg>
      }
    }
  `,
  styles: `
    :host { display: inline-block; flex: none; color: var(--ui-ornament-color, var(--ui-color-primary)); line-height: 0; pointer-events: none; }
    :host(.ui-ornament--corner) { width: 3.5rem; height: 3.5rem; }
    :host(.ui-ornament--knot) { width: 4rem; height: 1.5rem; }
    :host(.ui-ornament--flourish) { width: 7.5rem; height: 1.5rem; }
    :host(.ui-ornament--crest) { width: 1.5rem; height: 1.5rem; }
    svg { display: block; width: 100%; height: 100%; overflow: visible; }
  `,
})
export class UiOrnament {
  /** Motif. */
  readonly kind = input<UiOrnamentKind>('flourish');
}
