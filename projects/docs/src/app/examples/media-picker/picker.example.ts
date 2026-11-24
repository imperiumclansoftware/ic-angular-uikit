import { Component, signal, viewChild } from '@angular/core';
import { UiButton, UiImage, UiMediaPicker, UiPickedMedia } from 'ic-angular-uikit';
import { createMediaLibrary } from './medias';

/**
 * Choisir un média
 * `pick()` ouvre le dialogue et renvoie une promesse : le média choisi, ou `null` si l'utilisateur annule. Onglet **Bibliothèque** (`ui-file-manager` limité aux images et vidéos, envoi de nouveaux fichiers possible) ou **Adresse** ; puis description : texte alternatif obligatoire pour une image (sauf image décorative cochée), titre de la vidéo, légende. Le texte alternatif enregistré dans la bibliothèque (`alt`) est proposé.
 * @order 1
 */
@Component({
  selector: 'doc-picker-example',
  imports: [UiMediaPicker, UiButton, UiImage],
  template: `
    <button uiButton (click)="choose()">Choisir une image ou une vidéo</button>
    <ui-media-picker #picker [source]="library" maxFileSize="5 Mo" />
    @if (result(); as media) {
      <div class="result">
        @if (media.kind === 'image') {
          <ui-image [src]="media.src" [alt]="media.alt" ratio="16/9" fit="contain" />
        }
        <pre>{{ json(media) }}</pre>
      </div>
    } @else if (cancelled()) {
      <p class="state">Annulé.</p>
    }
  `,
  styles: `.result { display: grid; grid-template-columns: minmax(0, 16rem) minmax(0, 1fr); gap: 1rem; margin-top: 1rem; align-items: start; } pre { margin: 0; font-size: 0.8rem; white-space: pre-wrap; } .state { color: var(--ui-color-text-muted); }`,
})
export class PickerExample {
  protected readonly library = createMediaLibrary();
  private readonly picker = viewChild.required<UiMediaPicker>('picker');
  protected readonly result = signal<UiPickedMedia | null>(null);
  protected readonly cancelled = signal(false);

  protected async choose(): Promise<void> {
    const media = await this.picker().pick();
    this.cancelled.set(!media);
    if (media) this.result.set(media);
  }

  protected json(media: UiPickedMedia): string {
    const { entry, ...rest } = media;
    return JSON.stringify({ ...rest, entry: entry?.name }, null, 2);
  }
}
