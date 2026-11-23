import { Component } from '@angular/core';
import { UiSectionDivider } from 'ic-angular-uikit';

/**
 * Séparateurs et titres de section
 * Un filet fin qui s'efface vers les bords, avec un motif central : nœud d'arabesques (`knot`, défaut), losange (`crest`), fleuron (`flourish`) ou rien. Avec `label`, le séparateur devient un titre de section (`role="heading"`, niveau `headingLevel`).
 * @order 1
 */
@Component({
  selector: 'doc-dividers-example',
  imports: [UiSectionDivider],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      <p>Fin du chapitre précédent.</p>
      <ui-section-divider />
      <ui-section-divider emblem="crest" />
      <ui-section-divider emblem="flourish" />
      <ui-section-divider label="Hauts faits du clan" [headingLevel]="3" />
      <p>Début de la section suivante.</p>
    </div>
  `,
  styles: `.imp { padding: 1rem 1.5rem; border-radius: var(--ui-radius-lg); } p { margin: 0; color: var(--ui-color-text-muted); }`,
})
export class DividersExample {}
