import { Component, computed, signal } from '@angular/core';
import { UiTextField } from 'ic-angular-uikit';

/**
 * Erreur manuelle (sans formulaire Angular)
 * L'input `error` impose un message et l'état invalide. Avec `formControl` / `ngModel`, c'est inutile : la validation est automatique (voir le guide **Validation**).
 * @order 3
 */
@Component({
  selector: 'doc-text-field-validation-example',
  imports: [UiTextField],
  template: `
    <div class="ex-stack">
      <ui-text-field label="Code promo" hint="5 caractères, ex. : NOEL5" [(value)]="code" [error]="error()" />
    </div>
  `,
})
export class TextFieldValidationExample {
  protected readonly code = signal('NOE');
  protected readonly error = computed(() => (this.code() && this.code().length !== 5 ? 'Le code fait 5 caractères.' : null));
}
