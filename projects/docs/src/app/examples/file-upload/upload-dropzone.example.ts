import { Component, signal } from '@angular/core';
import { UiFileRejection, UiFileUpload } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Zone de glisser-déposer
 * `mode="dropzone"` (défaut) : déposez des fichiers ou cliquez pour parcourir (aussi au clavier). Ici jusqu'à 5 images, 2 Mo chacune, 8 Mo au total : les contraintes s'affichent seules et les fichiers refusés sont listés avec la raison.
 * @order 1
 */
@Component({
  selector: 'doc-upload-dropzone-example',
  imports: [UiFileUpload, EventLogView],
  template: `
    <div style="max-width: 34rem">
      <ui-file-upload
        label="Photos du logement"
        accept="image/*"
        [maxFiles]="5"
        maxFileSize="2 Mo"
        maxTotalSize="8 Mo"
        [(files)]="photos"
        (rejected)="onRejected($event)"
        (removed)="log.add('removed', $event.name)"
      />
    </div>
    <p>{{ photos().length }} fichier(s) retenu(s)</p>
    <doc-event-log [log]="log" />
  `,
})
export class UploadDropzoneExample {
  protected readonly photos = signal<File[]>([]);
  protected readonly log = new EventLog();

  protected onRejected(rejections: UiFileRejection[]): void {
    this.log.add('rejected', rejections.map((r) => `${r.file.name} → ${r.reason}`));
  }
}
