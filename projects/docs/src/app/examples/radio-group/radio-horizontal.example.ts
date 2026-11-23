import { Component } from '@angular/core';
import { UiRadio, UiRadioGroup } from 'ic-angular-uikit';

/**
 * Disposition horizontale et tailles
 * `orientation="horizontal"` aligne les options ; `size` change la taille des boutons et du texte.
 * @order 2
 */
@Component({
  selector: 'doc-radio-horizontal-example',
  imports: [UiRadioGroup, UiRadio],
  template: `
    <div class="ex-stack">
      <ui-radio-group label="Taille (sm)" orientation="horizontal" size="sm" [value]="'m'">
        @for (s of sizes; track s) {
          <ui-radio [value]="s">{{ s.toUpperCase() }}</ui-radio>
        }
      </ui-radio-group>
      <ui-radio-group label="Note (lg)" orientation="horizontal" size="lg">
        @for (n of [1, 2, 3, 4, 5]; track n) {
          <ui-radio [value]="n">{{ n }}</ui-radio>
        }
      </ui-radio-group>
    </div>
  `,
})
export class RadioHorizontalExample {
  protected readonly sizes = ['xs', 's', 'm', 'l', 'xl'];
}
