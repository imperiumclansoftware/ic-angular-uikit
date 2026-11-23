import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButton, UiFileUpload, UiTextField } from 'ic-angular-uikit';

/**
 * Formulaire réactif et messages personnalisés
 * La valeur du contrôle est un tableau `File[]` : `Validators.required` fonctionne et la validation graphique s'applique. `rejectionMessages` remplace les messages de refus (paramètres `{name}`, `{size}`, `{max}`, `{accept}`…).
 * @order 4
 */
@Component({
  selector: 'doc-upload-form-example',
  imports: [ReactiveFormsModule, JsonPipe, UiFileUpload, UiTextField, UiButton],
  template: `
    <form class="ex-stack" style="max-width: 34rem" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <ui-text-field label="Objet" formControlName="subject" />
      <ui-file-upload
        label="Facture"
        mode="field"
        formControlName="invoice"
        accept=".pdf"
        maxFileSize="1 Mo"
        showSuccess
        successMessage="Facture prête à être envoyée."
        [rejectionMessages]="messages"
      />
      <div><button uiButton type="submit">Valider</button></div>
      @if (sent()) {
        <p><code>{{ sent() | json }}</code></p>
      }
    </form>
  `,
})
export class UploadFormExample {
  protected readonly form = new FormGroup({
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    invoice: new FormControl<File[]>([], { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly messages = {
    fileType: 'Seules les factures PDF sont acceptées (« {name} » refusé).',
    maxFileSize: '« {name} » pèse {size} : la limite est {max}. Compressez le PDF.',
  };
  protected readonly sent = signal<unknown>(null);

  protected submit(): void {
    const { subject, invoice } = this.form.getRawValue();
    this.sent.set(this.form.valid ? { subject, invoice: invoice.map((f) => `${f.name} (${f.size} o)`) } : null);
  }
}
