import { Component, viewChild } from '@angular/core';
import { Observable, interval, map, takeWhile, throwError } from 'rxjs';
import { UiButton, UiFileUpload, UiFileUploader } from 'ic-angular-uikit';
import { EventLog, EventLogView } from '../../shared/event-log';

/**
 * Envoi avec progression
 * `[upload]` reçoit une fonction qui envoie un fichier et renvoie sa progression. Avec `HttpClient` :
 * `http.post(url, formData, { reportProgress: true, observe: 'events' })`. Ici l'envoi est simulé ; un fichier dont le nom contient « echec » échoue, pour tester le bouton Réessayer. Avec `[autoUpload]="false"`, l'envoi part sur `uploadAll()`.
 * @order 3
 */
@Component({
  selector: 'doc-upload-progress-example',
  imports: [UiFileUpload, UiButton, EventLogView],
  template: `
    <div class="ex-stack" style="max-width: 34rem">
      <ui-file-upload
        label="Documents (envoi automatique)"
        [maxFiles]="10"
        maxFileSize="20 Mo"
        [upload]="fakeUpload"
        (uploaded)="log.add('uploaded', $event.file.name)"
        (uploadFailed)="log.add('uploadFailed', $event.file.name)"
      />
      <ui-file-upload #manual label="Documents (envoi manuel)" [maxFiles]="10" [upload]="fakeUpload" [autoUpload]="false" />
      <div><button uiButton icon="lucide:upload" (click)="manual.uploadAll()">Envoyer tout</button></div>
    </div>
    <doc-event-log [log]="log" />
  `,
})
export class UploadProgressExample {
  protected readonly manual = viewChild.required<UiFileUpload>('manual');
  protected readonly log = new EventLog();

  /** Simulation : progression de 10 % toutes les 150 ms. */
  protected readonly fakeUpload: UiFileUploader = (file: File): Observable<number> => {
    if (file.name.toLowerCase().includes('echec')) {
      return throwError(() => new Error('Serveur indisponible'));
    }
    return interval(150).pipe(
      map((tick) => (tick + 1) * 10),
      takeWhile((progress) => progress <= 100),
    );
  };
}
