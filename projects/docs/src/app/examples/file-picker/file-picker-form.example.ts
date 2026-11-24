import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButton, UiFileEntry, UiFilePicker } from 'ic-angular-uikit';
import { createPickerLibrary } from './library';

/**
 * Champ de sélection de fichiers et de médias
 * `ui-file-picker` est un champ de formulaire : les éléments choisis sont affichés (`display="grid"` en vignettes, `list` avec la taille), chacun avec un bouton Retirer ; « Choisir… » ouvre la bibliothèque dans un dialogue (double clic pour choisir directement, envoi de nouveaux fichiers possible). Valeur : un `UiFileEntry` ou `null`, ou un tableau avec `multiple` (`maxFiles`, `reorderable` pour l'ordre). `Validators.required` et les messages d'erreur fonctionnent comme sur les autres champs. Envoyez au serveur **les identifiants** ; il vérifie qu'ils appartiennent à l'utilisateur.
 * @order 1
 */
@Component({
  selector: 'doc-file-picker-form-example',
  imports: [ReactiveFormsModule, UiFilePicker, UiButton],
  template: `
    <form class="form" [formGroup]="form" (ngSubmit)="submit()">
      <ui-file-picker formControlName="cover" label="Image de couverture" [source]="library" accept="image/*" display="grid" hint="Affichée en tête de l’article." />
      <ui-file-picker formControlName="gallery" label="Galerie" [source]="library" accept="image/*,video/*" multiple [maxFiles]="6" reorderable display="grid" />
      <ui-file-picker formControlName="attachment" label="Pièce jointe" [source]="library" maxFileSize="5 Mo" />
      <button uiButton type="submit">Enregistrer</button>
    </form>
    @if (sent) {
      <p class="label">Corps envoyé au serveur (identifiants seulement) :</p>
      <pre>{{ sent }}</pre>
    }
  `,
  styles: `.form { display: grid; gap: 1.25rem; max-width: 40rem; } .form button { justify-self: start; } .label { margin: 1rem 0 0.25rem; font-weight: 600; } pre { margin: 0; font-size: 0.8rem; }`,
})
export class FilePickerFormExample {
  protected readonly library = createPickerLibrary();
  protected readonly form = new FormGroup({
    cover: new FormControl<UiFileEntry | null>(null, Validators.required),
    gallery: new FormControl<UiFileEntry[]>([], { nonNullable: true, validators: Validators.required }),
    attachment: new FormControl<UiFileEntry | null>(null),
  });
  protected sent = '';

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { cover, gallery, attachment } = this.form.getRawValue();
    this.sent = JSON.stringify({ coverId: cover?.id, galleryIds: gallery.map((e) => e.id), attachmentId: attachment?.id ?? null }, null, 2);
  }
}
