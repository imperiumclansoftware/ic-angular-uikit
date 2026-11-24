// app.config.ts — le jeton CSRF (cookie XSRF-TOKEN) est renvoyé automatiquement dans l'en-tête X-XSRF-TOKEN.
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }))],
};

// library.ts — gestionnaire de fichiers, galerie et éditeur branchés sur la même API.
import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UiFileEntry, UiFileManager, UiGalleryItem, UiMediaGallery, UiRichTextEditor, fileFamily, uiHttpFileSource } from 'ic-angular-uikit';

@Component({
  selector: 'app-library',
  imports: [UiFileManager, UiMediaGallery, UiRichTextEditor],
  template: `
    <!-- Les mêmes limites que le serveur (confort) : le serveur revérifie tout. -->
    <ui-file-manager [source]="files" maxFileSize="20 Mo" [(selection)]="selection" (open)="open($event)" (failed)="error.set($event.message)" />

    <ui-media-gallery [items]="gallery()" [(current)]="current" ariaLabel="Médias sélectionnés" />

    <!-- Éditeur : bouton « Image ou vidéo » sur la même bibliothèque ; le serveur doit accepter les figures. -->
    <ui-rich-text-editor label="Article" [mediaSource]="files" mediaMaxFileSize="20 Mo" [(value)]="article" />
  `,
})
export class Library {
  protected readonly files = uiHttpFileSource(inject(HttpClient), '/api/files');
  protected readonly selection = signal<readonly UiFileEntry[]>([]);
  protected readonly current = signal<number | null>(null);
  protected readonly article = signal('');
  protected readonly error = signal<string | null>(null);

  /** Images et vidéos sélectionnées, pour la galerie. */
  protected readonly gallery = computed<UiGalleryItem[]>(() =>
    this.selection()
      .filter((e) => e.url && (fileFamily(e) === 'image' || fileFamily(e) === 'video'))
      .map((e) => ({ src: e.url ?? '', alt: e.alt ?? e.name, kind: fileFamily(e) === 'video' ? 'video' : 'image', thumbnail: e.thumbnailUrl })),
  );

  /** Ouvrir : visionneuse pour les médias, téléchargement pour le reste (le serveur l'envoie en pièce jointe). */
  protected open(entry: UiFileEntry): void {
    const index = this.gallery().findIndex((item) => item.src === entry.url);
    if (index >= 0) this.current.set(index);
    else if (entry.url) location.assign(entry.url);
  }
}
