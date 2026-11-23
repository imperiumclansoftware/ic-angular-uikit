import { Component, signal } from '@angular/core';
import { UiButton, UiImage } from 'ic-angular-uikit';
import { PHOTOS } from './photos';

/**
 * Chargement, loader et fondu
 * L'emplacement est réservé par `ratio` (ou `width` / `height`) : la page ne bouge pas quand l'image arrive. Le loader de l'application est affiché pendant le téléchargement, puis l'image apparaît en fondu une fois **décodée**. `src` à `null` signifie « adresse pas encore connue » (lue depuis une API) : le loader patiente. Ici, le bouton simule une connexion lente (l'adresse n'est donnée qu'au bout de 2 s). Les images d'en-tête de page prennent `priority` (téléchargement immédiat, priorité haute).
 * @order 1
 */
@Component({
  selector: 'doc-image-basic-example',
  imports: [UiImage, UiButton],
  template: `
    <button uiButton variant="secondary" icon="lucide:refresh-cw" (click)="reload()">Recharger (connexion lente simulée)</button>
    <div class="grid">
      @for (photo of photos; track photo.src; let i = $index) {
        <figure>
          <ui-image [src]="sources()[i]" [alt]="photo.alt" ratio="4/3" [loader]="loaders[i]" />
          <figcaption>{{ photo.title }} — <code>loader="{{ loaders[i] }}"</code></figcaption>
        </figure>
      }
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 1rem; margin-top: 1rem; }
    figure { margin: 0; }
    ui-image { --ui-image-radius: var(--ui-radius-md); }
    figcaption { margin-top: 0.4rem; color: var(--ui-color-text-muted); font-size: 0.8125rem; }
  `,
})
export class ImageBasicExample {
  protected readonly photos = PHOTOS;
  protected readonly loaders = ['spinner', 'skeleton', 'pulse', 'line'];
  protected readonly sources = signal<(string | null)[]>(PHOTOS.map((p) => p.src));
  private version = 0;

  protected reload(): void {
    const v = ++this.version;
    this.sources.set(PHOTOS.map(() => null));
    PHOTOS.forEach((photo, i) => setTimeout(() => this.sources.update((list) => list.map((s, j) => (j === i ? `${photo.src}?v=${v}` : s))), 1200 + i * 500));
  }
}
