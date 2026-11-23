import { Component } from '@angular/core';
import { UI_IMPERIUM_BRANCHES, UiBranchBadge } from 'ic-angular-uikit';

/**
 * Les quatre branches
 * Joueurs (cramoisi), Développeurs (émeraude), Communicants (ambre), Ciné & séries (améthyste). Trois affichages : nom complet, nom court (`short`), icône seule (`icon`, nom accessible et infobulle) ; deux apparences : `soft` et `solid`. Le texte utilise une variante éclaircie de la couleur de branche pour garder un contraste ≥ 4,5:1 ; la couleur n'est jamais le seul indice (icône et libellé).
 * @order 1
 */
@Component({
  selector: 'doc-branch-badges-example',
  imports: [UiBranchBadge],
  template: `
    <div data-ui-theme="imperium-dark" class="imp">
      @for (row of rows; track row.label) {
        <p class="label">{{ row.label }}</p>
        <div class="row">
          @for (branch of branches; track branch.id) {
            <ui-branch-badge [branch]="branch.id" [display]="row.display" [appearance]="row.appearance" [size]="row.size" />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .imp { padding: 1.5rem; border-radius: var(--ui-radius-lg); }
    .row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .label { margin: 0 0 0.4rem; color: var(--ui-color-text-muted); font: 0.75rem var(--ui-font-family-mono); }
  `,
})
export class BranchBadgesExample {
  protected readonly branches = UI_IMPERIUM_BRANCHES;
  protected readonly rows = [
    { label: 'display="full" (défaut)', display: 'full', appearance: 'soft', size: 'sm' },
    { label: 'display="short" size="md"', display: 'short', appearance: 'soft', size: 'md' },
    { label: 'appearance="solid"', display: 'full', appearance: 'solid', size: 'sm' },
    { label: 'display="icon"', display: 'icon', appearance: 'soft', size: 'md' },
  ] as const;
}
