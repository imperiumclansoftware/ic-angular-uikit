import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  UiAlert,
  UiButton,
  UiCheckbox,
  UiRadio,
  UiRadioGroup,
  UiSelect,
  UiSelectOption,
  UiSwitch,
  UiTextField,
  UiTextarea,
} from 'ic-angular-uikit';

/**
 * Validation automatique
 * Aucun code d'affichage d'erreur : chaque champ lit les validateurs de son `FormControl`. L'astérisque vient de `Validators.required`, les messages des validateurs Angular sont traduits, et toutes les erreurs apparaissent à la soumission. Quittez un champ ou cliquez sur « Envoyer ».
 * @order 1
 */
@Component({
  selector: 'doc-full-form-example',
  imports: [ReactiveFormsModule, JsonPipe, UiTextField, UiTextarea, UiSelect, UiRadioGroup, UiRadio, UiCheckbox, UiSwitch, UiButton, UiAlert],
  template: `
    <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <ui-text-field label="Nom" formControlName="name" autocomplete="name" showSuccess />
      <ui-text-field label="E-mail" type="email" formControlName="email" autocomplete="email" showSuccess />
      <ui-text-field label="Âge" type="number" formControlName="age" hint="Entre 18 et 120 ans" />
      <ui-select label="Sujet" formControlName="topic" [options]="topics" />
      <ui-radio-group label="Priorité" orientation="horizontal" formControlName="priority">
        <ui-radio value="low">Basse</ui-radio>
        <ui-radio value="normal">Normale</ui-radio>
        <ui-radio value="high">Haute</ui-radio>
      </ui-radio-group>
      <ui-textarea label="Message" formControlName="message" autoResize rows="3" maxRows="10" maxLength="500" />
      <ui-switch formControlName="copy">M'envoyer une copie</ui-switch>
      <ui-checkbox formControlName="terms">J'accepte le traitement de mes données</ui-checkbox>
      <div class="ex-row">
        <button uiButton type="submit">Envoyer</button>
        <button uiButton type="button" variant="ghost" (click)="reset()">Réinitialiser</button>
      </div>
      @if (sent()) {
        <ui-alert tone="success" title="Formulaire valide" dismissible><code>{{ sent() | json }}</code></ui-alert>
      }
    </form>
  `,
  styles: `
    .form { display: flex; flex-direction: column; gap: 1rem; max-width: 32rem; }
    code { font-size: 0.75rem; word-break: break-all; }
  `,
})
export class FullFormExample {
  protected readonly topics: UiSelectOption<string>[] = [
    { value: 'support', label: 'Support technique' },
    { value: 'billing', label: 'Facturation' },
    { value: 'other', label: 'Autre' },
  ];
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    age: new FormControl<number | null>(null, { validators: [Validators.min(18), Validators.max(120)] }),
    topic: new FormControl<string | null>(null, { validators: [Validators.required] }),
    priority: new FormControl('normal', { nonNullable: true }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(20)] }),
    copy: new FormControl(false, { nonNullable: true }),
    terms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });
  protected readonly sent = signal<unknown>(null);

  protected submit(): void {
    this.sent.set(this.form.valid ? this.form.getRawValue() : null);
  }

  protected reset(): void {
    this.form.reset();
    this.sent.set(null);
  }
}
