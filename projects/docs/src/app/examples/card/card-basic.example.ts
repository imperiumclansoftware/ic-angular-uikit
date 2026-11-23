import { Component } from '@angular/core';
import { UiBadge, UiButton, UiCard, UiCardFooter, UiCardHeader } from 'ic-angular-uikit';

/**
 * Zones de contenu
 * En-tête, corps et pied sont des emplacements de projection : vous fournissez le balisage, la carte gère la mise en page.
 * @order 1
 */
@Component({
  selector: 'doc-card-basic-example',
  imports: [UiCard, UiCardHeader, UiCardFooter, UiButton, UiBadge],
  template: `
    <ui-card style="max-width: 24rem">
      <header uiCardHeader class="header">
        <h4>Abonnement Pro</h4>
        <ui-badge tone="success" pill>Actif</ui-badge>
      </header>
      <p>Prochain prélèvement le 1er décembre. Vous pouvez changer d'offre à tout moment.</p>
      <footer uiCardFooter>
        <button uiButton variant="ghost">Résilier</button>
        <button uiButton>Gérer</button>
      </footer>
    </ui-card>
  `,
  styles: `
    .header { display: flex; align-items: center; justify-content: space-between; }
    h4 { margin: 0; font-size: 1.05rem; }
    p { margin: 0; color: var(--ui-color-text-muted); }
  `,
})
export class CardBasicExample {}
