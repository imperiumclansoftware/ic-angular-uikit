import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButton, UiSelect, UiTextField, provideUiValidation } from 'ic-angular-uikit';

/**
 * Configuration globale ou par formulaire
 * `provideUiValidation` se place dans `app.config.ts` (toute l'application) ou dans les `providers` d'un composant, comme ici : ce formulaire n'affiche les erreurs qu'à la soumission, avec ses propres textes.
 * @order 4
 */
@Component({
  selector: 'doc-global-config-example',
  imports: [ReactiveFormsModule, UiTextField, UiSelect, UiButton],
  providers: [
    provideUiValidation({
      showErrorsWhen: 'submitted',
      messages: {
        required: '{label} : obligatoire',
        email: 'Adresse invalide',
      },
    }),
  ],
  template: `
    <form class="ex-stack" [formGroup]="form" (ngSubmit)="(0)" novalidate>
      <ui-text-field label="E-mail" type="email" formControlName="email" />
      <ui-select label="Langue" formControlName="lang" [options]="langs" />
      <div class="ex-row"><button uiButton type="submit">Valider</button></div>
    </form>
  `,
})
export class GlobalConfigExample {
  protected readonly langs = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
  ];
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    lang: new FormControl<string | null>(null, { validators: [Validators.required] }),
  });
}
