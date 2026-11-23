import { Component } from '@angular/core';
import { UiAlert } from 'ic-angular-uikit';

/**
 * Tons
 * Le ton choisit la couleur, l'icône et le rôle ARIA (`alert` pour `warning` / `danger`, `status` sinon).
 * @order 1
 */
@Component({
  selector: 'doc-alert-tones-example',
  imports: [UiAlert],
  template: `
    <div class="ex-stack" style="max-width: 36rem">
      <ui-alert tone="info" title="Information">Une nouvelle version est disponible.</ui-alert>
      <ui-alert tone="success" title="Enregistré">Vos modifications ont été sauvegardées.</ui-alert>
      <ui-alert tone="warning">Votre session expire dans 5 minutes.</ui-alert>
      <ui-alert tone="danger" title="Échec du paiement">La carte a été refusée.</ui-alert>
    </div>
  `,
})
export class AlertTonesExample {}
