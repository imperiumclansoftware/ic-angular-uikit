import { Component } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { UiTextField } from 'ic-angular-uikit';

/** Simule un appel API : « admin », « root » et « test » sont déjà pris. */
async function usernameAvailable(control: AbstractControl): Promise<ValidationErrors | null> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const taken = ['admin', 'root', 'test'].includes(String(control.value).toLowerCase());
  return taken ? { taken: { message: `« ${control.value} » est déjà utilisé.` } } : null;
}

/**
 * Validation asynchrone et état « valide »
 * Pendant un validateur asynchrone, le champ affiche « Vérification… » (bordure pointillée). `showSuccess` et `successMessage` confirment une saisie correcte. Essayez « admin ».
 * @order 3
 */
@Component({
  selector: 'doc-async-validator-example',
  imports: [ReactiveFormsModule, UiTextField],
  template: `
    <div class="ex-stack">
      <ui-text-field
        label="Pseudo"
        [formControl]="username"
        showErrorsWhen="dirty"
        showSuccess
        successMessage="Ce pseudo est disponible."
      />
    </div>
  `,
})
export class AsyncValidatorExample {
  protected readonly username = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
    asyncValidators: [usernameAvailable],
  });
}
