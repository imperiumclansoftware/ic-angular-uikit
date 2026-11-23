import { Component } from '@angular/core';
import { UiButton } from 'ic-angular-uikit';

/**
 * Variantes et couleurs
 * Quatre styles pour hiérarchiser les actions (`primary` pour l'action principale) et trois couleurs sémantiques :
 * `success` pour valider, `warning` pour une action à risque, `danger` pour une action destructrice.
 * @order 1
 */
@Component({
  selector: 'doc-button-variants-example',
  imports: [UiButton],
  template: `
    <div class="ex-row">
      <button uiButton>Primary</button>
      <button uiButton variant="secondary">Secondary</button>
      <button uiButton variant="outline">Outline</button>
      <button uiButton variant="ghost">Ghost</button>
    </div>
    <div class="ex-row" style="margin-top: 1rem">
      <button uiButton variant="success">Success</button>
      <button uiButton variant="warning">Warning</button>
      <button uiButton variant="danger">Danger</button>
    </div>
  `,
})
export class ButtonVariantsExample {}
