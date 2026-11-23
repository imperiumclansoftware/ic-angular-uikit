import { Component } from '@angular/core';
import { UiOrnament } from 'ic-angular-uikit';

/**
 * Motifs d'arabesques
 * Les ornements sont des SVG en trait, nets à toutes les tailles, qui prennent la couleur `--ui-ornament-color` (or antique dans le thème `imperium-dark`, couleur principale ailleurs). Ils servent de briques aux cadres, séparateurs et bannières, et peuvent décorer vos propres composants. Toujours décoratifs (`aria-hidden`).
 * @order 1
 */
@Component({
  selector: 'doc-ornament-kinds-example',
  imports: [UiOrnament],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      <figure><ui-ornament kind="corner" /><figcaption>corner</figcaption></figure>
      <figure><ui-ornament kind="knot" /><figcaption>knot</figcaption></figure>
      <figure><ui-ornament kind="flourish" /><figcaption>flourish</figcaption></figure>
      <figure><ui-ornament kind="crest" /><figcaption>crest</figcaption></figure>
      <figure><ui-ornament kind="flourish" style="width: 12rem; height: 2.4rem; --ui-ornament-color: var(--ui-branch-cine)" /><figcaption>flourish, 12rem, améthyste</figcaption></figure>
    </div>
  `,
  styles: `
    .imp { display: flex; flex-wrap: wrap; align-items: center; gap: 2rem; padding: 1.5rem; border-radius: var(--ui-radius-lg); }
    figure { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin: 0; }
    figcaption { color: var(--ui-color-text-muted); font: 0.75rem var(--ui-font-family-mono); }
  `,
})
export class OrnamentKindsExample {}
