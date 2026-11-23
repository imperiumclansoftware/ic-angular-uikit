// app.config.ts — le jeton CSRF (cookie XSRF-TOKEN) est renvoyé automatiquement dans l'en-tête X-XSRF-TOKEN.
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))],
};

// documents.ts — un fichier par requête, avec la progression.
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UiFileUpload, UiFileUploaded, UiFileUploader } from 'ic-angular-uikit';

interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

@Component({
  selector: 'app-documents',
  imports: [UiFileUpload],
  template: `
    <ui-file-upload
      label="Justificatifs"
      accept="image/png,image/jpeg,image/webp,application/pdf"
      [maxFiles]="5"
      maxFileSize="5 Mo"
      [upload]="upload"
      (uploaded)="onUploaded($event)"
    />
  `,
})
export class Documents {
  private readonly http = inject(HttpClient);
  protected readonly stored: StoredFile[] = [];

  protected readonly upload: UiFileUploader = (file) => {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<StoredFile>('/api/uploads', body, { reportProgress: true, observe: 'events' });
  };

  protected onUploaded(event: UiFileUploaded): void {
    this.stored.push(event.response as StoredFile); // { id, name, size, type } renvoyé par le serveur
  }
}
