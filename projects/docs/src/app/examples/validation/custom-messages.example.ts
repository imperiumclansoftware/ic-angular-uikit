import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { UiErrorMessages, UiTextField } from 'ic-angular-uikit';

/** Validateur maison : le message voyage avec l'erreur. */
function noSpaces(control: AbstractControl): ValidationErrors | null {
  return /\s/.test(control.value ?? '') ? { noSpaces: { message: 'Les espaces ne sont pas autorisés.' } } : null;
}

/**
 * Messages personnalisés
 * Trois façons de personnaliser, de la plus spécifique à la plus générale : `[errorMessages]` sur le champ (texte avec `{paramètres}` ou fonction), la propriété `message` renvoyée par un validateur maison, et `provideUiValidation` (exemple suivant).
 * @order 2
 */
@Component({
  selector: 'doc-custom-messages-example',
  imports: [ReactiveFormsModule, UiTextField],
  template: `
    <form class="ex-stack" [formGroup]="form">
      <ui-text-field
        label="Identifiant"
        formControlName="login"
        hint="Lettres, chiffres, points ; sans espace"
        showErrorsWhen="dirty"
        [errorMessages]="loginMessages"
      />
      <ui-text-field
        label="Référence"
        formControlName="reference"
        hint="Format AA-123"
        showErrorsWhen="dirty"
        [errorMessages]="{ pattern: 'Format attendu : deux lettres, un tiret, trois chiffres (AA-123).' }"
      />
    </form>
  `,
})
export class CustomMessagesExample {
  protected readonly form = new FormGroup({
    login: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4), Validators.maxLength(12), noSpaces] }),
    reference: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^[A-Z]{2}-\d{3}$/)] }),
  });

  protected readonly loginMessages: UiErrorMessages = {
    required: 'Choisissez un {label}.',
    minlength: ({ requiredLength, actualLength }) => `Encore ${requiredLength - actualLength} caractère(s).`,
    maxlength: '{requiredLength} caractères maximum.',
  };
}
