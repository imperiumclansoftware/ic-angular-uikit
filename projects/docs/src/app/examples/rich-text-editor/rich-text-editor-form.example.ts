import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButton, UiRichTextEditor, UiSwitch, UiTextField, richTextMaxLength } from 'ic-angular-uikit';

/**
 * Dans un formulaire, avec validation
 * `formControlName` comme pour les autres champs. `Validators.required` fonctionne directement (la valeur est vide quand rien n'est saisi) ; `richTextMaxLength(280)` compte le texte visible, sans les balises, et `maxLength` affiche le compteur. `blocks` limite les types de paragraphe proposés ; `disable()` sur le contrôle désactive l'éditeur.
 * @order 2
 */
@Component({
  selector: 'doc-rich-text-editor-form-example',
  imports: [ReactiveFormsModule, UiRichTextEditor, UiTextField, UiButton, UiSwitch],
  template: `
    <form class="form" [formGroup]="form" (ngSubmit)="submit()">
      <ui-text-field label="Titre" formControlName="title" />
      <ui-rich-text-editor
        label="Commentaire"
        formControlName="comment"
        placeholder="Votre commentaire (280 caractères au plus)…"
        hint="Gras, italique, listes et liens autorisés."
        [maxLength]="280"
        [blocks]="['p']"
      />
      <div class="actions">
        <ui-switch size="sm" [checked]="form.controls.comment.disabled" (checkedChange)="toggleDisabled($event)">Désactiver l'éditeur</ui-switch>
        <button uiButton type="submit">Publier</button>
      </div>
    </form>
    @if (sent(); as value) {
      <p class="sent" role="status">Envoyé : {{ value.length }} caractères de HTML.</p>
    }
  `,
  styles: `
    .form { display: grid; gap: 1rem; max-width: 40rem; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
    .sent { margin: 1rem 0 0; color: var(--ui-color-success-text); }
  `,
})
export class RichTextEditorFormExample {
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    comment: new FormControl('', { nonNullable: true, validators: [Validators.required, richTextMaxLength(280)] }),
  });
  protected readonly sent = signal<string | null>(null);

  protected toggleDisabled(disabled: boolean): void {
    const control = this.form.controls.comment;
    if (disabled) control.disable();
    else control.enable();
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.valid) this.sent.set(this.form.controls.comment.value);
  }
}
