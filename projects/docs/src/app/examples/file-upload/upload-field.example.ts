import { Component } from '@angular/core';
import { UiFileUpload } from 'ic-angular-uikit';

/**
 * Champ de formulaire
 * `mode="field"` : un champ compact avec un bouton « Parcourir… ». Avec `maxFiles` à 1 (défaut), un nouveau choix remplace le fichier courant ; au-delà, les fichiers s'ajoutent jusqu'à la limite.
 * @order 2
 */
@Component({
  selector: 'doc-upload-field-example',
  imports: [UiFileUpload],
  template: `
    <div class="ex-stack">
      <ui-file-upload mode="field" label="Curriculum vitae" accept=".pdf,.doc,.docx" maxFileSize="2 Mo" hint="Votre CV à jour." />
      <ui-file-upload mode="field" label="Justificatifs" accept=".pdf,image/*" [maxFiles]="3" maxFileSize="5 Mo" />
      <ui-file-upload mode="field" label="Désactivé" disabled />
    </div>
  `,
})
export class UploadFieldExample {}
