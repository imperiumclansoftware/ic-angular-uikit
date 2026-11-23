import { Component } from '@angular/core';
import { UiTextarea } from 'ic-angular-uikit';

/**
 * Hauteur automatique
 * Avec `autoResize`, le champ grandit avec le texte entre `rows` et `maxRows` lignes, puis défile. Repose sur `field-sizing: content` ; les navigateurs plus anciens gardent une hauteur fixe.
 * @order 2
 */
@Component({
  selector: 'doc-textarea-autoresize-example',
  imports: [UiTextarea],
  template: `
    <div class="ex-stack">
      <ui-textarea label="Message" placeholder="Écrivez plusieurs lignes…" autoResize rows="2" maxRows="8" />
    </div>
  `,
})
export class TextareaAutoresizeExample {}
